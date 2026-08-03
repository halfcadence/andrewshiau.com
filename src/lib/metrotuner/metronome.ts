// Metronome scheduling, split in two so the math is testable without audio:
//
//   tickAt()    — pure: (spec, start, n) → when tick n sounds and which voice plays.
//   Scheduler   — the lookahead loop ("A Tale of Two Clocks"): a coarse JS interval
//                 that schedules ticks a short window ahead on the audio clock, so
//                 timing precision comes from the audio thread, not from setInterval.
//
// The Scheduler takes the clock and the play callback as injected functions, so the
// unit tests drive it with a fake clock and assert exactly which ticks were
// scheduled at which times. The page passes `() => audioCtx.currentTime` and a
// function that starts an oscillator.

export interface MetronomeSpec {
  bpm: number;          // beats per minute (the BEAT, not the subdivision)
  beatsPerBar: number;  // accent every N beats; 1 = every beat accented
  subdivision: number;  // ticks per beat: 1 quarter, 2 eighths, 3 triplets, 4 sixteenths
}

export type Voice = 'down' | 'beat' | 'sub';

export interface Tick {
  n: number;      // tick index from start
  time: number;   // audio-clock seconds
  voice: Voice;
  beatInBar: number; // 0-based beat this tick belongs to, for the beat indicator
}

export const BPM_MIN = 20;
export const BPM_MAX = 320;

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return 120;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

export function tickAt(spec: MetronomeSpec, startTime: number, n: number): Tick {
  const secPerTick = 60 / spec.bpm / spec.subdivision;
  const ticksPerBar = spec.beatsPerBar * spec.subdivision;
  const posInBar = n % ticksPerBar;
  const voice: Voice =
    posInBar === 0 ? 'down'
    : posInBar % spec.subdivision === 0 ? 'beat'
    : 'sub';
  return {
    n,
    time: startTime + n * secPerTick,
    voice,
    beatInBar: Math.floor(posInBar / spec.subdivision),
  };
}

export interface SchedulerOpts {
  now: () => number;                 // the audio clock, in seconds
  play: (tick: Tick) => void;        // schedule one click at tick.time
  lookahead?: number;                // how far ahead to schedule, seconds
  interval?: number;                 // JS wake-up cadence, ms
  setInterval?: typeof globalThis.setInterval;
  clearInterval?: typeof globalThis.clearInterval;
}

export class Scheduler {
  private spec: MetronomeSpec;
  private opts: Required<Pick<SchedulerOpts, 'lookahead' | 'interval'>> & SchedulerOpts;
  private timer: ReturnType<typeof globalThis.setInterval> | null = null;
  private startTime = 0;
  private nextN = 0;

  constructor(spec: MetronomeSpec, opts: SchedulerOpts) {
    this.spec = { ...spec };
    this.opts = { lookahead: 0.1, interval: 25, ...opts };
  }

  get running(): boolean { return this.timer !== null; }

  start(): void {
    if (this.timer !== null) return;
    // A slight offset so the first tick is scheduled ahead, never in the past.
    this.startTime = this.opts.now() + 0.05;
    this.nextN = 0;
    const si = this.opts.setInterval ?? globalThis.setInterval.bind(globalThis);
    this.pump();
    this.timer = si(() => this.pump(), this.opts.interval);
  }

  stop(): void {
    if (this.timer === null) return;
    const ci = this.opts.clearInterval ?? globalThis.clearInterval.bind(globalThis);
    ci(this.timer);
    this.timer = null;
  }

  // Tempo/meter changes take effect at the NEXT tick, re-anchored so the pulse
  // doesn't jump: the new grid starts where the old one left off.
  setSpec(spec: MetronomeSpec): void {
    const wasRunning = this.timer !== null;
    if (wasRunning) {
      const lastScheduled = tickAt(this.spec, this.startTime, this.nextN);
      this.startTime = lastScheduled.time;
      this.nextN = 0;
    }
    this.spec = { ...spec };
  }

  pump(): void {
    const horizon = this.opts.now() + this.opts.lookahead;
    let t = tickAt(this.spec, this.startTime, this.nextN);
    while (t.time < horizon) {
      this.opts.play(t);
      this.nextN++;
      t = tickAt(this.spec, this.startTime, this.nextN);
    }
  }
}
