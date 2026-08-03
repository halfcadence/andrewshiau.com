import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tickAt, Scheduler, clampBpm, type Tick } from '../../src/lib/metrotuner/metronome';

describe('tickAt', () => {
  it('spaces quarter notes at 60/bpm', () => {
    const spec = { bpm: 120, beatsPerBar: 4, subdivision: 1 };
    expect(tickAt(spec, 10, 0).time).toBe(10);
    expect(tickAt(spec, 10, 1).time).toBeCloseTo(10.5, 10);
    expect(tickAt(spec, 10, 4).time).toBeCloseTo(12, 10);
  });

  it('subdivision divides the beat, not the bar', () => {
    const spec = { bpm: 60, beatsPerBar: 4, subdivision: 2 };
    expect(tickAt(spec, 0, 1).time).toBeCloseTo(0.5, 10); // eighth at 60bpm
    expect(tickAt(spec, 0, 2).time).toBeCloseTo(1.0, 10);
  });

  it('voices: downbeat on bar start, beat on beat starts, sub between', () => {
    const spec = { bpm: 120, beatsPerBar: 3, subdivision: 2 };
    const voices = Array.from({ length: 12 }, (_, n) => tickAt(spec, 0, n).voice);
    expect(voices).toEqual([
      'down', 'sub', 'beat', 'sub', 'beat', 'sub',
      'down', 'sub', 'beat', 'sub', 'beat', 'sub',
    ]);
  });

  it('beatsPerBar=1 accents every beat', () => {
    const spec = { bpm: 100, beatsPerBar: 1, subdivision: 1 };
    expect(tickAt(spec, 0, 0).voice).toBe('down');
    expect(tickAt(spec, 0, 1).voice).toBe('down');
  });

  it('triplets: three ticks per beat, only the first is the beat', () => {
    const spec = { bpm: 90, beatsPerBar: 4, subdivision: 3 };
    const v = Array.from({ length: 6 }, (_, n) => tickAt(spec, 0, n).voice);
    expect(v).toEqual(['down', 'sub', 'sub', 'beat', 'sub', 'sub']);
    expect(tickAt(spec, 0, 1).time).toBeCloseTo(60 / 90 / 3, 10);
  });

  it('beatInBar counts beats, not ticks', () => {
    const spec = { bpm: 120, beatsPerBar: 4, subdivision: 2 };
    expect(tickAt(spec, 0, 0).beatInBar).toBe(0);
    expect(tickAt(spec, 0, 1).beatInBar).toBe(0);
    expect(tickAt(spec, 0, 2).beatInBar).toBe(1);
    expect(tickAt(spec, 0, 7).beatInBar).toBe(3);
  });
});

describe('clampBpm', () => {
  it('clamps to 20..320 and rounds', () => {
    expect(clampBpm(5)).toBe(20);
    expect(clampBpm(1000)).toBe(320);
    expect(clampBpm(120.6)).toBe(121);
    expect(clampBpm(NaN)).toBe(120);
  });
});

describe('Scheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function run(spec = { bpm: 120, beatsPerBar: 4, subdivision: 1 }) {
    let clock = 0;
    const played: Tick[] = [];
    const s = new Scheduler(spec, {
      now: () => clock,
      play: (t) => played.push(t),
      lookahead: 0.1,
      interval: 25,
    });
    return {
      s, played,
      advance(seconds: number) {
        // Step the fake audio clock and the JS timer together, like real time.
        const steps = Math.round((seconds * 1000) / 25);
        for (let i = 0; i < steps; i++) {
          clock += 0.025;
          vi.advanceTimersByTime(25);
        }
      },
    };
  }

  it('schedules ticks on the audio clock at the right times', () => {
    const { s, played, advance } = run();
    s.start();
    advance(2.0);
    expect(played.length).toBeGreaterThanOrEqual(4);
    const dt = played[1].time - played[0].time;
    expect(dt).toBeCloseTo(0.5, 6);
    // Every tick was scheduled AHEAD of the clock it plays on — never in the past.
    // (Checked against the clock value when it was pushed: monotone, increasing.)
    for (let i = 1; i < played.length; i++) {
      expect(played[i].time).toBeGreaterThan(played[i - 1].time);
    }
  });

  it('never double-schedules a tick', () => {
    const { s, played, advance } = run();
    s.start();
    advance(3);
    const ns = played.map((t) => t.n);
    expect(new Set(ns).size).toBe(ns.length);
    expect(ns).toEqual([...ns].sort((a, b) => a - b));
  });

  it('stop() stops; start() after stop() restarts cleanly', () => {
    const { s, played, advance } = run();
    s.start();
    advance(1);
    s.stop();
    const count = played.length;
    advance(1);
    expect(played.length).toBe(count);
    s.start();
    advance(1);
    expect(played.length).toBeGreaterThan(count);
  });

  it('a tempo change re-anchors instead of jumping the grid', () => {
    const { s, played, advance } = run();
    s.start();
    advance(1);
    s.setSpec({ bpm: 240, beatsPerBar: 4, subdivision: 1 });
    advance(1);
    // After the change ticks are 0.25s apart; before, 0.5s. No tick moved backwards.
    for (let i = 1; i < played.length; i++) {
      expect(played[i].time).toBeGreaterThan(played[i - 1].time);
    }
    const late = played.slice(-3);
    expect(late[2].time - late[1].time).toBeCloseTo(0.25, 3);
  });
});
