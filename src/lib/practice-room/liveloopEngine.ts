// THE LIVE LOOP'S ENGINE: an AudioWorklet overdub looper, four fixed lanes, sample-exact.
//
// This is the only instrument in the room that RECORDS. Everything else measures a signal
// (tuner), sounds one (drone, metronome, changes) or drives someone else's recording (loop).
// So it is the only one that has to care about the two facts below, which are the whole reason
// this file is not fifty lines.
//
// ══ FACT 1. LATENCY IS A WRITE OFFSET, NOT A DELAY YOU HEAR ═══════════════════════════════
// You monitor yourself through your own interface, at zero latency, so the round trip is
// inaudible while you play. What it does instead is PRINT every layer late by that amount —
// so an uncompensated stack smears, one layer at a time, and the smear is the thing people
// mistake for "cheap looper sound".
// The fix here is deliberately not "record, then shift the buffer": every input sample is
// written at `(frame − latency)` in loop coordinates, so compensation is a subtraction in an
// index expression and there is no second pass, no reallocation, and no drift between lanes.
// `calibrate()` measures the number; until it runs, `latencyFrames` is 0 and the engine says so.
//
// ══ FACT 2. ONE CLOCK, AND IT IS THIS PROCESSOR'S FRAME COUNTER ═══════════════════════════
// The click is generated INSIDE the worklet rather than scheduled from the main thread, and
// the bar quantisation is computed inside it too. Both could have been done on the main
// thread — `metronome.ts` already has a Scheduler, and it is deliberately not reused here —
// but then the click, the punch and the loop would be following three clocks that agree only
// as well as `postMessage` timing does. A punch that lands two milliseconds late is a punch
// that prints two milliseconds of the previous bar, forever. The worklet knows `currentFrame`;
// everything is derived from it.
//
// ══ WHAT THIS DELIBERATELY DOES NOT DO ════════════════════════════════════════════════════
// It does not monitor input to output. Routing the mic to the speakers while loops of that
// same mic are playing is how you get feedback on a stage, and he monitors through the
// interface anyway. Input reaches the worklet and nothing else.
// It has no per-lane effects. Reverb is one convolver on the SUM, after the looper, because a
// reverb before it gets printed into every layer and accumulates — see `setReverb`.

export type LaneMode = 'replace' | 'overdub';

export interface LaneView {
  name: string;
  hasAudio: boolean;
  recording: boolean;
  muted: boolean;
  level: number;
  /** Peak of the last take. 0 with `hasAudio` true means the lane recorded silence — see the
   *  note in the processor's end-of-take branch for why that needs saying out loud. */
  peak: number;
}

export interface LiveLoopView {
  running: boolean;
  loopPos: number;
  bar: number;
  beat: number;
  bars: number;
  armed: number;
  armPending: boolean;
  lanes: LaneView[];
  latencyFrames: number;
  calibrated: boolean;
}

export interface CalibrationResult {
  ok: boolean;
  ms: number;
  frames: number;
  jitter: number;
  passes: number;
  reason?: string;
}

/** The four lanes, in the order they sit. Fixed by input, never reassigned — the one thing
 *  four independent looping performers all converge on (Sheeran's GUITAR/BOOM/RC20/VOX,
 *  Dub FX's three blocks, Rebillet's build order). Bass is absent on purpose: on the songs
 *  this instrument is for, the bass is the hook and stays in your hands. */
export const LANES = ['drums', 'harmony', 'voice', 'spare'] as const;

/* ══════════════════════════════════════════════════════════════════════════════════════════
   THE PROCESSOR. Authored as a string and loaded from a Blob URL so the whole instrument is
   one module with no extra asset to serve or hash. The cost, stated: this code is not
   type-checked and not covered by the unit suite, which is why every branch in it is either
   trivial or asserted from outside by tools/verify-live-loop.mjs against an OfflineAudioContext.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
const PROCESSOR = String.raw`
class LiveLoopProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.laneCount = o.laneCount || 4;
    this.loopFrames = o.loopFrames || sampleRate * 2;
    this.barFrames = o.barFrames || this.loopFrames;
    this.lanes = [];
    for (let i = 0; i < this.laneCount; i++) {
      this.lanes.push({ buf: new Float32Array(this.loopFrames), has: false, muted: false, level: 1, peak: 0 });
    }
    this.origin = -1;          // frame the transport started on; -1 = stopped
    this.armed = -1;           // lane index waiting to record, or recording
    this.armMode = 'replace';
    this.armStart = -1;        // absolute frame recording begins
    this.armEnd = -1;          // absolute frame recording ends
    this.recording = false;
    this.latency = 0;
    this.click = true;
    this.reportAt = 0;

    this.port.onmessage = (e) => this.command(e.data);
  }

  command(m) {
    switch (m.type) {
      case 'config': {
        // Reconfiguring resizes every lane, so it clears them. Changing the song mid-stack
        // silently keeping old audio at a new length would be worse than losing it.
        this.loopFrames = m.loopFrames;
        this.barFrames = m.barFrames;
        for (const l of this.lanes) { l.buf = new Float32Array(this.loopFrames); l.has = false; l.peak = 0; }
        this.origin = -1; this.armed = -1; this.recording = false;
        break;
      }
      case 'start':
        // Start on the next block so the origin is a frame that has not happened yet.
        this.origin = currentFrame + 128;
        break;
      case 'stop':
        this.origin = -1; this.armed = -1; this.recording = false;
        break;
      case 'arm': {
        if (this.origin < 0) break;
        this.armed = m.lane;
        this.armMode = m.mode || 'replace';
        // THE PUNCH IS QUANTISED HERE, not where the button was pressed. Next bar line at or
        // after now; a press exactly on the line does not skip a bar.
        const since = currentFrame - this.origin;
        const bars = Math.ceil(since / this.barFrames);
        this.armStart = this.origin + bars * this.barFrames;
        this.armEnd = this.armStart + this.loopFrames;
        this.port.postMessage({ type: 'armed', lane: m.lane, startFrame: this.armStart });
        break;
      }
      case 'disarm':
        this.armed = -1; this.recording = false;
        break;
      case 'mute':
        if (this.lanes[m.lane]) this.lanes[m.lane].muted = !!m.on;
        break;
      case 'level':
        if (this.lanes[m.lane]) this.lanes[m.lane].level = m.value;
        break;
      case 'clear':
        if (this.lanes[m.lane]) { this.lanes[m.lane].buf.fill(0); this.lanes[m.lane].has = false; this.lanes[m.lane].peak = 0; }
        break;
      case 'latency':
        this.latency = m.frames | 0;
        break;
      case 'click':
        this.click = !!m.on;
        break;
    }
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const outL = out[0];
    const n = outL.length;
    const inCh = inputs[0] && inputs[0][0];

    if (this.origin < 0) {
      // stopped: silence, but stay alive so the node is never re-created
      for (const ch of out) ch.fill(0);
      return true;
    }

    const lf = this.loopFrames;

    for (let i = 0; i < n; i++) {
      const frame = currentFrame + i;
      const since = frame - this.origin;
      if (since < 0) { for (const ch of out) ch[i] = 0; continue; }

      // ── RECORD. Compensation is this subtraction: the sample arriving now was PLAYED
      //    "latency" frames ago, so that is where it belongs in loop coordinates.
      //    (No backticks anywhere in this processor: it lives inside a template literal, and
      //    one backtick in a comment ends the string and breaks the build.)
      if (this.armed >= 0 && frame >= this.armStart && frame < this.armEnd) {
        if (!this.recording) {
          this.recording = true;
          if (this.armMode === 'replace') {
            this.lanes[this.armed].buf.fill(0);
          }
          this.port.postMessage({ type: 'recstart', lane: this.armed });
        }
        const lane = this.lanes[this.armed];
        let pos = (frame - this.latency - this.origin) % lf;
        if (pos < 0) pos += lf;
        const x = inCh ? inCh[i] : 0;
        lane.buf[pos] = this.armMode === 'overdub' ? lane.buf[pos] + x : x;
      } else if (this.recording && frame >= this.armEnd) {
        this.recording = false;
        const done = this.lanes[this.armed];
        done.has = true;
        // THE TAKE'S PEAK, REPORTED. A lane that recorded SILENCE still holds a take, so
        // "has audio" cannot tell you whether anything arrived — and recording silence is a
        // real performing failure with mundane causes: the wrong input selected, a muted
        // channel, a dead cable. The number is cheap here (one pass over a buffer we just
        // finished writing) and it is the only way the page can say so out loud.
        let pk = 0;
        for (let q = 0; q < done.buf.length; q++) { const a = done.buf[q] < 0 ? -done.buf[q] : done.buf[q]; if (a > pk) pk = a; }
        done.peak = pk;
        this.port.postMessage({ type: 'recorded', lane: this.armed, peak: pk });
        this.armed = -1;
      }

      // ── PLAY. Sum the unmuted lanes at one shared loop position, so lanes cannot drift.
      let pos = since % lf;
      if (pos < 0) pos += lf;
      let s = 0;
      for (let k = 0; k < this.laneCount; k++) {
        const l = this.lanes[k];
        if (l.has && !l.muted) s += l.buf[pos] * l.level;
      }

      // ── CLICK, from the same counter. Short enveloped sine, bar one higher.
      if (this.click) {
        const inBar = pos % this.barFrames;
        const beatFrames = this.barFrames / 4;
        const inBeat = inBar % beatFrames;
        const clickLen = (sampleRate * 0.03) | 0;
        if (inBeat < clickLen) {
          const beatIdx = (inBar / beatFrames) | 0;
          const f = beatIdx === 0 ? 1600 : 1000;
          const env = 1 - inBeat / clickLen;
          s += Math.sin((2 * Math.PI * f * inBeat) / sampleRate) * env * env * 0.22;
        }
      }

      for (const ch of out) ch[i] = s;
    }

    // Report position ~30×/s. The UI does not need every block and postMessage is not free.
    if (currentFrame - this.reportAt > sampleRate / 30) {
      this.reportAt = currentFrame;
      const since = currentFrame - this.origin;
      let pos = since % lf; if (pos < 0) pos += lf;
      this.port.postMessage({
        type: 'pos',
        loopPos: pos / lf,
        bar: Math.floor(pos / this.barFrames),
        beat: Math.floor((pos % this.barFrames) / (this.barFrames / 4)),
        lanes: this.lanes.map((l) => ({ has: l.has, muted: l.muted, peak: l.peak })),
        recording: this.recording,
        armed: this.armed,
      });
    }
    return true;
  }
}
registerProcessor('live-loop', LiveLoopProcessor);
`;

/** A short linear chirp. Cross-correlates far more sharply against room noise than a click,
 *  and the correlator below was proven on planted offsets: exact recovery at amplitudes down
 *  to 0.08, and correct REJECTION of noise-only and wrong-signal controls. */
export function chirpBuffer(ctx: BaseAudioContext, ms = 20): AudioBuffer {
  const n = Math.round((ctx.sampleRate * ms) / 1000);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const f0 = 500, f1 = 5000, T = n / ctx.sampleRate;
  for (let i = 0; i < n; i++) {
    const t = i / ctx.sampleRate;
    const phase = 2 * Math.PI * (f0 * t + ((f1 - f0) * t * t) / (2 * T));
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    d[i] = Math.sin(phase) * w * 0.6;
  }
  return buf;
}

/**
 * Normalised cross-correlation with a GUARD BAND.
 *
 * The guard band is not a refinement, it is the bug fix: a chirp correlates almost as well one
 * sample either side of the true lag, so comparing the peak against the literal second-best
 * value scored a PERFECT detection at ratio 1.07 and a naive `ratio > 1.25` gate rejected it.
 * Measured after the fix: signal arms 7.0–8.4, noise-only 1.0–1.1.
 */
export function findChirp(
  rec: Float32Array, startFrame: number, template: Float32Array,
  fromFrame: number, toFrame: number, guardSamples?: number,
): { frame: number; peak: number; ratio: number } {
  const m = template.length;
  const guard = guardSamples ?? Math.round(m / 4);
  let tE = 0;
  for (let j = 0; j < m; j++) tE += template[j] * template[j];
  tE = Math.sqrt(tE) || 1;
  const lo = Math.max(fromFrame, startFrame);
  const hi = Math.min(toFrame, startFrame + rec.length - m);
  if (hi < lo) return { frame: -1, peak: 0, ratio: 0 };
  const vals = new Float32Array(hi - lo + 1);
  for (let f = lo; f <= hi; f++) {
    const i0 = f - startFrame;
    let dot = 0, e = 0;
    for (let j = 0; j < m; j++) { const x = rec[i0 + j]; dot += x * template[j]; e += x * x; }
    vals[f - lo] = Math.abs(dot) / (Math.sqrt(e) * tE || 1);
  }
  let best = -1, bestVal = 0;
  for (let k = 0; k < vals.length; k++) if (vals[k] > bestVal) { bestVal = vals[k]; best = lo + k; }
  let rival = 0;
  for (let k = 0; k < vals.length; k++) {
    if (Math.abs(lo + k - best) <= guard) continue;
    if (vals[k] > rival) rival = vals[k];
  }
  return { frame: best, peak: bestVal, ratio: bestVal / (rival || 1e-9) };
}

/** Generated reverb impulse: noise under an exponential decay. No asset to ship, and the
 *  decay is capped by the caller at half the loop length — reverb longer than that smears
 *  the loop point into the next cycle. */
export function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const n = Math.max(1, Math.round(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6);
    }
  }
  return buf;
}

export class LiveLoop {
  private ctx: AudioContext;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private conv: ConvolverNode | null = null;
  private moduleUrl: string | null = null;

  private bars = 4;
  private loopFramesValue = 0;
  private barFramesValue = 0;

  latencyFrames = 0;
  calibrated = false;
  running = false;

  view: LiveLoopView = {
    running: false, loopPos: 0, bar: 0, beat: 0, bars: 4, armed: -1, armPending: false,
    lanes: LANES.map((name) => ({ name, hasAudio: false, recording: false, muted: false, level: 1, peak: 0 })),
    latencyFrames: 0, calibrated: false,
  };

  onView: ((v: LiveLoopView) => void) | null = null;
  /** Fired when a take finishes, with its peak — so the page can say "that recorded silence". */
  onRecorded: ((lane: number, peak: number) => void) | null = null;

  constructor(ctx: AudioContext) { this.ctx = ctx; }

  get sampleRate() { return this.ctx.sampleRate; }
  get loopFrames() { return this.loopFramesValue; }

  private emit() {
    this.view.running = this.running;
    this.view.bars = this.bars;
    this.view.latencyFrames = this.latencyFrames;
    this.view.calibrated = this.calibrated;
    this.onView?.(this.view);
  }

  /** getUserMedia + worklet + the output chain. Called on a gesture; the mic is not opened
   *  until the player asks for it, which is the same promise the tuner makes. */
  async open(): Promise<void> {
    if (this.node) return;
    // These three MUST be false. Echo cancellation exists to subtract what the speakers played
    // out of what the mic heard — which is precisely the loop you are trying to overdub onto.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false, channelCount: 1 },
      video: false,
    });
    this.moduleUrl = URL.createObjectURL(new Blob([PROCESSOR], { type: 'application/javascript' }));
    await this.ctx.audioWorklet.addModule(this.moduleUrl);

    this.node = new AudioWorkletNode(this.ctx, 'live-loop', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
      processorOptions: { laneCount: LANES.length, loopFrames: this.loopFramesValue || this.ctx.sampleRate * 2, barFrames: this.barFramesValue || this.ctx.sampleRate },
    });
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.src.connect(this.node);

    // REVERB AFTER THE LOOPER, on the sum — one room for the loops and for what you are
    // playing live over them, and nothing printed into a layer.
    this.dry = this.ctx.createGain();
    this.wet = this.ctx.createGain();
    this.conv = this.ctx.createConvolver();
    this.dry.gain.value = 1;
    this.wet.gain.value = 0;
    this.node.connect(this.dry).connect(this.ctx.destination);
    this.node.connect(this.conv);
    this.conv.connect(this.wet).connect(this.ctx.destination);

    this.node.port.onmessage = (e) => this.fromWorklet(e.data);
    this.emit();
  }

  private fromWorklet(m: any) {
    if (m.type === 'pos') {
      this.view.loopPos = m.loopPos;
      this.view.bar = m.bar;
      this.view.beat = m.beat;
      this.view.armed = m.armed;
      this.view.armPending = m.armed >= 0 && !m.recording;
      m.lanes.forEach((l: any, i: number) => {
        this.view.lanes[i].hasAudio = l.has;
        this.view.lanes[i].muted = l.muted;
        this.view.lanes[i].peak = l.peak ?? 0;
        this.view.lanes[i].recording = m.recording && m.armed === i;
      });
      this.emit();
    } else if (m.type === 'recorded') {
      this.view.lanes[m.lane].hasAudio = true;
      this.view.lanes[m.lane].peak = m.peak ?? 0;
      this.onRecorded?.(m.lane, m.peak ?? 0);
      this.emit();
    } else if (m.type === 'recstart' || m.type === 'armed') {
      this.emit();
    }
  }

  /** Loop geometry. Clears the lanes — see the processor's `config` note. */
  setLoop(loopFramesValue: number, barFramesValue: number, bars: number) {
    this.loopFramesValue = loopFramesValue;
    this.barFramesValue = barFramesValue;
    this.bars = bars;
    this.view.lanes.forEach((l) => { l.hasAudio = false; l.recording = false; });
    this.node?.port.postMessage({ type: 'config', loopFrames: loopFramesValue, barFrames: barFramesValue });
    this.emit();
  }

  start() { this.running = true; this.node?.port.postMessage({ type: 'start' }); this.emit(); }
  stop() { this.running = false; this.node?.port.postMessage({ type: 'stop' }); this.emit(); }
  arm(lane: number, mode: LaneMode = 'replace') { this.node?.port.postMessage({ type: 'arm', lane, mode }); }
  disarm() { this.node?.port.postMessage({ type: 'disarm' }); }
  clear(lane: number) {
    this.view.lanes[lane].hasAudio = false;
    this.node?.port.postMessage({ type: 'clear', lane });
    this.emit();
  }
  mute(lane: number, on: boolean) {
    this.view.lanes[lane].muted = on;
    this.node?.port.postMessage({ type: 'mute', lane, on });
    this.emit();
  }
  level(lane: number, value: number) {
    this.view.lanes[lane].level = value;
    this.node?.port.postMessage({ type: 'level', lane, value });
  }
  click(on: boolean) { this.node?.port.postMessage({ type: 'click', on }); }

  /** Reverb amount, with the decay capped at `ceilingSeconds` (half the loop). */
  setReverb(mix: number, ceilingSeconds: number) {
    if (!this.conv || !this.wet || !this.dry) return;
    const want = Math.min(Math.max(0.3, ceilingSeconds * 0.8), ceilingSeconds);
    if (!this.conv.buffer || Math.abs(this.conv.buffer.duration - want) > 0.05) {
      this.conv.buffer = makeImpulse(this.ctx, want);
    }
    this.wet.gain.value = mix;
    this.dry.gain.value = 1 - mix * 0.35;
  }

  setLatencyFrames(frames: number) {
    this.latencyFrames = Math.max(0, Math.round(frames));
    this.calibrated = true;
    this.node?.port.postMessage({ type: 'latency', frames: this.latencyFrames });
    this.emit();
  }

  /**
   * Measure the round trip: emit a chirp, capture it coming back, correlate.
   *
   * Runs on a SEPARATE tap node rather than through the looper, so calibrating never touches
   * a lane. Requires the output to reach the input — a cable out→in, or speakers into the mic.
   */
  async calibrate(passes = 6): Promise<CalibrationResult> {
    if (!this.stream) return { ok: false, ms: 0, frames: 0, jitter: 0, passes: 0, reason: 'mic not open' };
    const ctx = this.ctx;
    const tapCode = String.raw`
class Tap extends AudioWorkletProcessor {
  process(inputs){ const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage({ frame: currentFrame, data: new Float32Array(ch) });
    return true; }
}
registerProcessor('ll-tap', Tap);`;
    const url = URL.createObjectURL(new Blob([tapCode], { type: 'application/javascript' }));
    try { await ctx.audioWorklet.addModule(url); } catch { /* already registered */ }
    const tap = new AudioWorkletNode(ctx, 'll-tap', { numberOfOutputs: 0 });
    const src = ctx.createMediaStreamSource(this.stream);
    src.connect(tap);
    let blocks: { frame: number; data: Float32Array }[] = [];
    tap.port.onmessage = (e) => blocks.push(e.data);

    const tmplBuf = chirpBuffer(ctx);
    const tmpl = tmplBuf.getChannelData(0);
    const got: number[] = [];

    for (let p = 0; p < passes; p++) {
      blocks = [];
      const when = ctx.currentTime + 0.35;
      const scheduled = Math.round(when * ctx.sampleRate);
      const node = ctx.createBufferSource();
      node.buffer = tmplBuf;
      node.connect(ctx.destination);
      node.start(when);
      await new Promise((r) => setTimeout(r, 900));

      const from = scheduled, to = scheduled + Math.round(0.4 * ctx.sampleRate);
      const rel = blocks
        .filter((b) => b.frame + b.data.length >= from - 256 && b.frame <= to + tmpl.length + 256)
        .sort((a, b) => a.frame - b.frame);
      if (!rel.length) continue;
      const start = rel[0].frame;
      const end = rel[rel.length - 1].frame + rel[rel.length - 1].data.length;
      const rec = new Float32Array(end - start);
      for (const b of rel) rec.set(b.data, b.frame - start);
      const hit = findChirp(rec, start, tmpl, from, to);
      const frames = hit.frame - scheduled;
      if (hit.peak > 0.35 && hit.ratio > 2 && frames >= 0) got.push(frames);
    }

    src.disconnect();
    tap.disconnect();
    URL.revokeObjectURL(url);

    if (got.length < 3) {
      return { ok: false, ms: 0, frames: 0, jitter: 0, passes: got.length,
        reason: 'no clear reply — patch output to input, or raise the speaker' };
    }
    got.sort((a, b) => a - b);
    const med = got[Math.floor(got.length / 2)];
    const jitter = ((got[got.length - 1] - got[0]) / ctx.sampleRate) * 1000;
    this.setLatencyFrames(med);
    return { ok: true, ms: (med / ctx.sampleRate) * 1000, frames: med, jitter, passes: got.length };
  }

  /** Close the mic. The stream is released, not just muted — the promise is that nothing is
   *  listening once you leave. */
  release() {
    this.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.src?.disconnect();
    this.node?.disconnect();
    if (this.moduleUrl) URL.revokeObjectURL(this.moduleUrl);
    this.stream = null; this.src = null; this.node = null; this.moduleUrl = null;
    this.emit();
  }
}
