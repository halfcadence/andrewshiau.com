// THE LIVE LOOP'S ENGINE: an AudioWorklet overdub looper, four fixed lanes, sample-exact.
//
// ══ WHAT A LOOPER ACTUALLY IS ═════════════════════════════════════════════════════════════
// Read from the Boss RC-505mkII / RC-600 parameter guides, the EHX 95000 manual, the Aeros
// manual and Ableton's Looper chapter (sources in loop-guide/research/looper-mechanics.json):
//
//     one fixed-length buffer of floats per track, a read cursor, and a state machine.
//
// Playback reads buffer[cursor] and advances cursor modulo loopLength. Overdub is an in-place
// read-modify-write — buffer[i] = buffer[i] + input[i] — and is therefore DESTRUCTIVE. Not one
// commercial unit keeps a layer stack. Undo exists only because the device keeps exactly ONE
// spare copy of the buffer, which is why undo is one level deep almost everywhere. Everything
// the box appears to know about music is two integers and a policy: loopLength in samples, the
// bar grid derived from it, and the rule for a press that misses a grid point.
//
// This file is that machine, with three consequences designed in rather than discovered.
//
// ══ 1. TWO BUFFERS PER LANE, AND UNDO IS FREE ═════════════════════════════════════════════
// Each lane owns `front` (playing) and `back` (the take being recorded). A finished take SWAPS
// them, so the previous content survives as `back` and is what undo restores — the hardware's
// one-spare-copy model, arrived at for the hardware's reason. It also makes the two failure
// modes free instead of destructive: an abandoned punch simply never swaps, so `front` is
// untouched, and nothing has to be zeroed while a take is in flight.
//
// ══ 2. LATENCY IS A WRITE OFFSET, NOT A DELAY YOU HEAR ════════════════════════════════════
// You monitor through your own interface, so the round trip is inaudible while you play. What
// it does instead is PRINT every layer late — so an uncompensated stack smears one layer at a
// time. Every input sample is written at (frame − latency) in loop coordinates: compensation is
// a subtraction in an index expression, with no second pass and no drift between lanes.
// The offset is SEEDED from ctx.baseLatency + ctx.outputLatency, which is free and exactly
// covers the output half, because `calibrate()` needs output→input coupling that the correct
// rig (interface in, headphones out) does not have. There is no input-latency property in Web
// Audio at all, so the remainder can only be measured.
//
// ══ 3. ONE CLOCK, AND IT IS THIS PROCESSOR'S FRAME COUNTER ════════════════════════════════
// Playback and recording both index (frame − origin), so repeats add ZERO error — a loop does
// not accumulate drift per pass, which is the thing everyone assumes it does. What drifts, when
// input and output are different physical devices with independent crystals, is the round-trip
// offset ITSELF: at 100 ppm (two consumer clocks at ±50 ppm) it moves 100 µs per second, so a
// lane punched ten minutes in sits ~60 ms from one punched at the start. A fixed offset cannot
// correct a ramp. So `calibrate()` records WHEN it measured and reports ppm on the next run, and
// the engine warns when input and output are not the same device.
//
// ══ WHAT THIS DELIBERATELY DOES NOT DO ════════════════════════════════════════════════════
// Input is not monitored to output by default. Hardware loopers pass dry through (Boss INPUT
// THRU, default ON) but they are not sharing a room with a laptop's own speakers and mic.
// `setMonitor()` exists for the case where the interface has no direct monitoring; it is off
// until asked for, and the page warns when input and output are the same built-in device.
// There are no per-lane effects: reverb is one convolver on the SUM, after the looper, because
// a reverb before it is printed into every layer and accumulates. The click is on its OWN
// output so it bypasses that reverb — a four-second hall on a reference tone is a wash under
// the music, not a metronome.

import { spanFrames, FORGIVENESS_MS } from './liveloop';

export type LaneMode = 'replace' | 'overdub';

export interface LaneView {
  name: string;
  hasAudio: boolean;
  recording: boolean;
  /** armed and waiting for its bar line — the state the quantiser exists to produce */
  armed: boolean;
  muted: boolean;
  level: number;
  /** Peak of the last take. 0 with `hasAudio` true means the lane recorded SILENCE. */
  peak: number;
  /** whether an undo is available — i.e. whether `back` holds something worth returning to */
  canUndo: boolean;
}

export interface LiveLoopView {
  running: boolean;
  loopPos: number;
  bar: number;
  beat: number;
  bars: number;
  lanes: LaneView[];
  latencyFrames: number;
  calibrated: boolean;
  /** null until known; true when input and output are the same physical device */
  sameDevice: boolean | null;
  monitoring: boolean;
}

export interface CalibrationResult {
  ok: boolean;
  ms: number;
  frames: number;
  jitter: number;
  passes: number;
  /** clock drift against the previous calibration, in ppm — null on the first run */
  ppm: number | null;
  reason?: string;
}

/** The four lanes, in the order they sit. Fixed by input, never reassigned — the one thing
 *  four independent looping performers all converge on (Sheeran's GUITAR/BOOM/RC20/VOX,
 *  Dub FX's three blocks, Rebillet's build order). Bass is absent on purpose: on the songs
 *  this instrument is for, the bass is the hook and stays in your hands. */
export const LANES = ['drums', 'harmony', 'voice', 'spare'] as const;

/** Buffer capacity, in seconds. Allocated ONCE at open() for the longest song the picker
 *  offers plus headroom, so changing song is an integer change and never an allocation —
 *  `new Float32Array(549104)` on the audio thread is 2.2 MB of zeroing inside a 2.9 ms render
 *  budget, i.e. a dropout at the exact moment the player pressed something. */
export const CAPACITY_SECONDS = 20;

/* ══════════════════════════════════════════════════════════════════════════════════════════
   THE PROCESSOR. Authored as a string and loaded from a Blob URL so the whole instrument is
   one module with no extra asset to serve or hash. Two costs, stated: this code is not
   type-checked, and it is covered only from outside — tests/e2e/live-loop.spec.ts drives it
   through the page and asserts a real punch by its printed PEAK, red-armed by writing zeros.
   NO BACKTICKS ANYWHERE BELOW: this lives inside a template literal, and one backtick in a
   comment ends the string and fails the build with a bogus "expected a semicolon".
   ══════════════════════════════════════════════════════════════════════════════════════════ */
const PROCESSOR = String.raw`
const PREP_CHUNK = 8192;

class LiveLoopProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.laneCount = o.laneCount || 4;
    this.capacity = o.capacity || ((sampleRate * 20) | 0);
    this.loopFrames = o.loopFrames || sampleRate * 2;
    this.barFrames = o.barFrames || this.loopFrames;
    this.lanes = [];
    for (let i = 0; i < this.laneCount; i++) {
      this.lanes.push({
        front: new Float32Array(this.capacity),
        back: new Float32Array(this.capacity),
        has: false, backHas: false, muted: false, level: 1, peak: 0, backPeak: 0,
      });
    }
    this.origin = -1;
    this.armed = -1;
    this.armMode = 'replace';
    this.armStart = -1;
    this.armEnd = -1;
    this.recording = false;
    this.takePeak = 0;
    this.prepIdx = -1;
    this.latency = 0;
    this.click = true;
    this.reportAt = 0;
    this.port.onmessage = (e) => this.command(e.data);
  }

  // Prepare the take's target a chunk at a time, during the pre-roll. A replace zeroes it; an
  // overdub copies the current content in, so the record branch can simply ADD and the result
  // is the destructive read-modify-write every hardware unit performs. Spreading it over the
  // pre-roll is what keeps a 2.2 MB memset out of a single 2.9 ms render quantum.
  prep(budget) {
    if (this.prepIdx < 0) return;
    const l = this.lanes[this.armed];
    if (!l) { this.prepIdx = -1; return; }
    const end = Math.min(this.loopFrames, this.prepIdx + budget);
    if (this.armMode === 'overdub' && l.has) {
      l.back.set(l.front.subarray(this.prepIdx, end), this.prepIdx);
    } else {
      l.back.fill(0, this.prepIdx, end);
    }
    this.prepIdx = end >= this.loopFrames ? -1 : end;
  }

  finishTake() {
    const l = this.lanes[this.armed];
    this.recording = false;
    if (this.prepIdx >= 0) this.prep(this.loopFrames);
    l.backHas = l.has; l.backPeak = l.peak;
    const f = l.front; l.front = l.back; l.back = f;
    l.has = true;
    l.peak = this.takePeak;
    this.port.postMessage({ type: 'recorded', lane: this.armed, peak: this.takePeak });
    this.armed = -1;
    this.prepIdx = -1;
  }

  command(m) {
    switch (m.type) {
      case 'config':
        // O(1): the buffers were allocated once at construction, so a song change is two
        // integers and a flag. Lanes are dropped deliberately — a stack kept at a new length
        // would be silently wrong — but nothing is zeroed, because a lane with has=false is
        // never read and the prep pass clears whatever it is about to write.
        if (m.loopFrames <= this.capacity) {
          this.loopFrames = m.loopFrames;
          this.barFrames = m.barFrames;
        }
        for (const l of this.lanes) { l.has = false; l.backHas = false; l.peak = 0; l.backPeak = 0; }
        this.origin = -1; this.armed = -1; this.recording = false; this.prepIdx = -1;
        break;
      case 'start':
        this.origin = currentFrame + 128;
        this.port.postMessage({ type: 'started', origin: this.origin });
        break;
      case 'stop':
        // STOP PRESERVES THE BUFFER. Every unit in the survey does, and this page says so on
        // screen, so it had better be true: nothing here touches a lane.
        this.origin = -1; this.armed = -1; this.recording = false; this.prepIdx = -1;
        break;
      case 'arm': {
        if (this.origin < 0) break;
        // A take already running is ENDED properly rather than abandoned silently — arming a
        // second lane mid-take used to leave the first one marked empty and its audio lost.
        if (this.recording && this.armed >= 0) this.finishTake();
        this.armed = m.lane;
        this.armMode = m.mode || 'replace';
        // The grid was computed on the main thread by the unit-tested arithmetic. All this does
        // is refuse a start already in the past, moving it by WHOLE BARS so it stays on the
        // grid — the only thing the message's travel time can invalidate.
        let s = m.startFrame;
        while (s < currentFrame + 128) s += this.barFrames;
        this.armStart = s;
        this.armEnd = s + m.frames;
        this.prepIdx = 0;
        this.takePeak = 0;
        this.port.postMessage({ type: 'armed', lane: m.lane, startFrame: this.armStart });
        break;
      }
      case 'disarm':
        // Abandoning a punch costs nothing and destroys nothing: the take was going into the
        // back buffer, so front is exactly as it was.
        this.armed = -1; this.recording = false; this.prepIdx = -1;
        this.port.postMessage({ type: 'disarmed' });
        break;
      case 'undo': {
        // One level, per lane, by swapping front and back — the hardware model. Undoing twice
        // returns you to where you started, which is what a redo is.
        const l = this.lanes[m.lane];
        if (!l) break;
        const f = l.front; l.front = l.back; l.back = f;
        const h = l.has; l.has = l.backHas; l.backHas = h;
        const p = l.peak; l.peak = l.backPeak; l.backPeak = p;
        this.port.postMessage({ type: 'undone', lane: m.lane, has: l.has });
        break;
      }
      case 'mute':
        if (this.lanes[m.lane]) this.lanes[m.lane].muted = !!m.on;
        break;
      case 'level':
        if (this.lanes[m.lane]) this.lanes[m.lane].level = m.value;
        break;
      case 'clear': {
        const l = this.lanes[m.lane];
        if (!l) break;
        // Clearing is undoable too, by the same swap: front goes to back, the lane reads empty.
        l.backHas = l.has; l.backPeak = l.peak;
        const f = l.front; l.front = l.back; l.back = f;
        l.has = false; l.peak = 0;
        this.port.postMessage({ type: 'cleared', lane: m.lane });
        break;
      }
      case 'latency':
        this.latency = m.frames | 0;
        break;
      case 'click':
        this.click = !!m.on;
        break;
    }
  }

  process(inputs, outputs) {
    const music = outputs[0];
    const clickOut = outputs[1];
    const n = music[0].length;
    const inCh = inputs[0] && inputs[0][0];

    if (this.origin < 0) {
      for (const ch of music) ch.fill(0);
      if (clickOut) for (const ch of clickOut) ch.fill(0);
      return true;
    }

    this.prep(PREP_CHUNK);
    const lf = this.loopFrames;
    const bf = this.barFrames;
    const beatFrames = bf / 4;
    const clickLen = (sampleRate * 0.03) | 0;

    for (let i = 0; i < n; i++) {
      const frame = currentFrame + i;
      const since = frame - this.origin;
      if (since < 0) {
        for (const ch of music) ch[i] = 0;
        if (clickOut) for (const ch of clickOut) ch[i] = 0;
        continue;
      }

      if (this.armed >= 0 && frame >= this.armStart && frame < this.armEnd) {
        if (!this.recording) {
          this.recording = true;
          if (this.prepIdx >= 0) this.prep(lf);
          this.port.postMessage({ type: 'recstart', lane: this.armed });
        }
        const lane = this.lanes[this.armed];
        let wpos = (frame - this.latency - this.origin) % lf;
        if (wpos < 0) wpos += lf;
        const x = inCh ? inCh[i] : 0;
        // The peak is accumulated HERE, one compare per written sample, rather than scanned at
        // the end of the take: a 549,104-sample scan inside one 128-frame quantum is a dropout
        // at the exact moment the player is listening for the loop to come round.
        const a = x < 0 ? -x : x;
        if (a > this.takePeak) this.takePeak = a;
        lane.back[wpos] = this.armMode === 'overdub' ? lane.back[wpos] + x : x;
      } else if (this.recording && frame >= this.armEnd) {
        this.finishTake();
      }

      let pos = since % lf;
      if (pos < 0) pos += lf;
      let s = 0;
      for (let k = 0; k < this.laneCount; k++) {
        const l = this.lanes[k];
        if (l.has && !l.muted) s += l.front[pos] * l.level;
      }
      for (const ch of music) ch[i] = s;

      if (clickOut) {
        let c = 0;
        if (this.click) {
          const inBar = pos % bf;
          const inBeat = inBar % beatFrames;
          if (inBeat < clickLen) {
            const f = ((inBar / beatFrames) | 0) === 0 ? 1600 : 1000;
            const env = 1 - inBeat / clickLen;
            c = Math.sin((2 * Math.PI * f * inBeat) / sampleRate) * env * env * 0.22;
          }
        }
        for (const ch of clickOut) ch[i] = c;
      }
    }

    if (currentFrame - this.reportAt > sampleRate / 30) {
      this.reportAt = currentFrame;
      let pos = (currentFrame - this.origin) % lf; if (pos < 0) pos += lf;
      this.port.postMessage({
        type: 'pos',
        loopPos: pos / lf,
        bar: (pos / bf) | 0,
        beat: ((pos % bf) / beatFrames) | 0,
        lanes: this.lanes.map((l) => ({
          has: l.has, muted: l.muted, peak: l.peak, canUndo: l.backHas || l.has,
        })),
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

/** Generated reverb impulse: noise under an exponential decay. No asset to ship. Built on the
 *  main thread and only when the length actually changes — 373,268 Math.random calls is tens of
 *  milliseconds of jank, so it must never land on a transport press. */
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
  private limiter: DynamicsCompressorNode | null = null;
  private monitorGain: GainNode | null = null;
  private moduleUrl: string | null = null;

  private bars = 4;
  private loopFramesValue = 0;
  private barFramesValue = 0;
  private originFrame = 0;
  private calHistory: { frames: number; at: number }[] = [];

  latencyFrames = 0;
  calibrated = false;
  running = false;

  view: LiveLoopView = {
    running: false, loopPos: 0, bar: 0, beat: 0, bars: 4,
    lanes: LANES.map((name) => ({
      name, hasAudio: false, recording: false, armed: false, muted: false,
      level: 1, peak: 0, canUndo: false,
    })),
    latencyFrames: 0, calibrated: false, sameDevice: null, monitoring: false,
  };

  onView: ((v: LiveLoopView) => void) | null = null;
  /** Fired when a take finishes, with its peak — so the page can say "that recorded silence". */
  onRecorded: ((lane: number, peak: number) => void) | null = null;
  /** Fired once, if input and output turn out to be the same physical device. */
  onSameDevice: ((same: boolean) => void) | null = null;

  constructor(ctx: AudioContext) { this.ctx = ctx; }

  get sampleRate() { return this.ctx.sampleRate; }
  get loopFrames() { return this.loopFramesValue; }
  get forgivenessFrames() { return Math.round((FORGIVENESS_MS / 1000) * this.sampleRate); }

  private emit() {
    this.view.running = this.running;
    this.view.bars = this.bars;
    this.view.latencyFrames = this.latencyFrames;
    this.view.calibrated = this.calibrated;
    this.onView?.(this.view);
  }

  async open(): Promise<void> {
    if (this.node) return;
    // These three MUST be false. Echo cancellation exists to subtract what the speakers played
    // out of what the mic heard — and it treats an acoustic overdub as permanent double-talk,
    // so it cancels the PLAYER, not merely the bleed.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false, channelCount: 1 },
      video: false,
    });
    this.moduleUrl = URL.createObjectURL(new Blob([PROCESSOR], { type: 'application/javascript' }));
    await this.ctx.audioWorklet.addModule(this.moduleUrl);

    const capacity = Math.round(this.ctx.sampleRate * CAPACITY_SECONDS);
    this.node = new AudioWorkletNode(this.ctx, 'live-loop', {
      numberOfInputs: 1,
      numberOfOutputs: 2,                 // 0 = music (reverb applies), 1 = click (it must not)
      outputChannelCount: [2, 1],
      processorOptions: {
        laneCount: LANES.length, capacity,
        loopFrames: this.loopFramesValue || this.ctx.sampleRate * 2,
        barFrames: this.barFramesValue || this.ctx.sampleRate,
      },
    });
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.src.connect(this.node);

    this.dry = this.ctx.createGain();
    this.wet = this.ctx.createGain();
    this.conv = this.ctx.createConvolver();
    this.limiter = this.ctx.createDynamicsCompressor();
    // A safety limiter, not a sound: four lanes at unity plus a click sum with no ceiling, and
    // four takes peaking 0.6 clip hard. Fast attack, high ratio, just below full scale.
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.15;
    this.dry.gain.value = 1;
    this.wet.gain.value = 0;

    this.node.connect(this.dry, 0).connect(this.limiter);
    this.node.connect(this.conv, 0);
    this.conv.connect(this.wet).connect(this.limiter);
    this.node.connect(this.limiter, 1);          // the click: dry, unreverbed, still limited
    this.limiter.connect(this.ctx.destination);

    // Software monitoring, off until asked for. See the header.
    this.monitorGain = this.ctx.createGain();
    this.monitorGain.gain.value = 0;
    this.src.connect(this.monitorGain).connect(this.limiter);

    // Seed the offset from what the browser already knows: never worse than 0, and it covers
    // the output half exactly. The input half needs `calibrate()`.
    const seeded = Math.round(
      ((this.ctx.baseLatency || 0) + (this.ctx.outputLatency || 0)) * this.ctx.sampleRate,
    );
    if (seeded > 0) {
      this.latencyFrames = seeded;
      this.node.port.postMessage({ type: 'latency', frames: seeded });
    }

    this.node.port.onmessage = (e) => this.fromWorklet(e.data);
    void this.checkDevices();
    this.emit();
  }

  /**
   * Is the input the same physical device as the output? If so the loop is coming out of the
   * same box the microphone is in: every overdub re-records the lanes already playing, so lane
   * two holds a comb-filtered copy of lane one, lane three holds two, and the stack turns to
   * mush one layer at a time. Matched on `groupId`, which is precisely what it is for.
   */
  private async checkDevices(): Promise<void> {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const inId = this.stream?.getAudioTracks()[0]?.getSettings().deviceId;
      const inDev = devs.find((d) => d.kind === 'audioinput' && d.deviceId === inId);
      const sink = (this.ctx as unknown as { sinkId?: string }).sinkId || 'default';
      const outDev = devs.find((d) => d.kind === 'audiooutput' && d.deviceId === sink)
        ?? devs.find((d) => d.kind === 'audiooutput' && d.deviceId === 'default');
      if (!inDev?.groupId || !outDev?.groupId) return;   // unknown, so say nothing
      const same = inDev.groupId === outDev.groupId;
      this.view.sameDevice = same;
      this.onSameDevice?.(same);
      this.emit();
    } catch { /* enumerateDevices can reject; a missing warning beats a wrong one */ }
  }

  private fromWorklet(m: { type: string; [k: string]: unknown }) {
    if (m.type === 'pos') {
      const p = m as unknown as {
        loopPos: number; bar: number; beat: number; recording: boolean; armed: number;
        lanes: { has: boolean; muted: boolean; peak: number; canUndo: boolean }[];
      };
      this.view.loopPos = p.loopPos;
      this.view.bar = p.bar;
      this.view.beat = p.beat;
      p.lanes.forEach((l, i) => {
        const v = this.view.lanes[i];
        v.hasAudio = l.has;
        v.muted = l.muted;
        v.peak = l.peak;
        v.canUndo = l.canUndo;
        v.recording = p.recording && p.armed === i;
        v.armed = p.armed === i && !p.recording;
      });
      this.emit();
    } else if (m.type === 'started') {
      this.originFrame = m.origin as number;
    } else if (m.type === 'recorded') {
      const lane = m.lane as number;
      const peak = (m.peak as number) ?? 0;
      this.view.lanes[lane].hasAudio = true;
      this.view.lanes[lane].peak = peak;
      this.view.lanes[lane].canUndo = true;
      this.onRecorded?.(lane, peak);
      this.emit();
    } else {
      this.emit();
    }
  }

  /**
   * Loop geometry. Only reaches the processor when it actually CHANGED, and that guard is the
   * fix for a data-loss bug: `config` drops every lane, so re-sending it on a transport press
   * erased a whole performance one press after the page promised that stopping keeps it.
   */
  setLoop(loopFramesValue: number, barFramesValue: number, bars: number) {
    this.bars = bars;
    if (loopFramesValue === this.loopFramesValue && barFramesValue === this.barFramesValue) {
      this.emit();
      return;
    }
    this.loopFramesValue = loopFramesValue;
    this.barFramesValue = barFramesValue;
    this.view.lanes.forEach((l) => {
      l.hasAudio = false; l.recording = false; l.armed = false; l.peak = 0; l.canUndo = false;
    });
    this.node?.port.postMessage({ type: 'config', loopFrames: loopFramesValue, barFrames: barFramesValue });
    this.emit();
  }

  start() { this.running = true; this.node?.port.postMessage({ type: 'start' }); this.emit(); }
  stop() { this.running = false; this.node?.port.postMessage({ type: 'stop' }); this.emit(); }

  /**
   * Punch a lane. The grid is computed HERE, by the unit-tested arithmetic in liveloop.ts, and
   * sent as an absolute frame; the processor only refuses a start already in the past. The
   * alternative — deriving the boundary inside the worklet — is what shipped first, and it put
   * the one piece of arithmetic that must not be wrong in the one file no test can reach.
   */
  arm(lane: number, mode: LaneMode = 'replace') {
    if (!this.node || !this.running) return;
    const now = Math.round(this.ctx.currentTime * this.sampleRate);
    const span = spanFrames(
      now, this.originFrame, this.barFramesValue, this.loopFramesValue,
      this.forgivenessFrames, 1,
    );
    this.node.port.postMessage({
      type: 'arm', lane, mode, startFrame: span.startFrame, frames: span.frames,
    });
  }

  disarm() { this.node?.port.postMessage({ type: 'disarm' }); }
  undo(lane: number) { this.node?.port.postMessage({ type: 'undo', lane }); }
  clear(lane: number) { this.node?.port.postMessage({ type: 'clear', lane }); }

  mute(lane: number, on: boolean) {
    this.view.lanes[lane].muted = on;
    this.node?.port.postMessage({ type: 'mute', lane, on });
    this.emit();
  }

  level(lane: number, value: number) {
    this.view.lanes[lane].level = value;
    this.node?.port.postMessage({ type: 'level', lane, value });
    this.emit();
  }

  click(on: boolean) { this.node?.port.postMessage({ type: 'click', on }); }

  /** Software monitoring: hear your own input through the page. Off by default — pointless if
   *  the interface has direct monitoring, and actively harmful into speakers. */
  setMonitor(on: boolean) {
    if (!this.monitorGain) return;
    this.monitorGain.gain.value = on ? 0.7 : 0;
    this.view.monitoring = on;
    this.emit();
  }

  setReverb(mix: number, ceilingSeconds: number) {
    if (!this.conv || !this.wet || !this.dry) return;
    const want = Math.min(Math.max(0.3, ceilingSeconds * 0.8), ceilingSeconds);
    if (!this.conv.buffer || Math.abs(this.conv.buffer.duration - want) > 0.05) {
      this.conv.buffer = makeImpulse(this.ctx, want);
    }
    // ConvolverNode.normalize defaults TRUE, so the wet path is scale-calibrated by the spec's
    // own formula rather than by this impulse's energy; `mix` is therefore roughly a send level
    // and not a wet percentage, and is deliberately conservative.
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
   * Refuses while the transport runs, because it emits six chirps at 0.6 into the output — with
   * a lane armed those would be printed into the take.
   */
  async calibrate(passes = 6): Promise<CalibrationResult> {
    const nil = { ok: false, ms: 0, frames: 0, jitter: 0, passes: 0, ppm: null };
    if (!this.stream) return { ...nil, reason: 'the microphone is not open' };
    if (this.running) return { ...nil, reason: 'stop the transport first — measuring emits chirps' };
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
    this.src?.connect(tap);
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

    this.src?.disconnect(tap);
    tap.disconnect();
    URL.revokeObjectURL(url);

    if (got.length < 3) {
      return {
        ...nil, passes: got.length,
        reason: 'no clear reply — patch output to input, or let the speakers reach the microphone',
      };
    }
    got.sort((a, b) => a - b);
    const med = got[Math.floor(got.length / 2)];
    const jitter = ((got[got.length - 1] - got[0]) / ctx.sampleRate) * 1000;

    // DRIFT, against the previous measurement. Two independent crystals move the true offset by
    // ~100 µs/s at 100 ppm, which a single fixed number cannot follow; comparing two
    // measurements taken apart in time is the cheapest way to see it at all.
    let ppm: number | null = null;
    const prev = this.calHistory[this.calHistory.length - 1];
    if (prev) {
      const dt = ctx.currentTime - prev.at;
      if (dt > 5) ppm = ((med - prev.frames) / ctx.sampleRate / dt) * 1e6;
    }
    this.calHistory.push({ frames: med, at: ctx.currentTime });
    this.setLatencyFrames(med);
    return { ok: true, ms: (med / ctx.sampleRate) * 1000, frames: med, jitter, passes: got.length, ppm };
  }

  /** Close the mic. The stream is released, not merely muted — the promise is that nothing is
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
