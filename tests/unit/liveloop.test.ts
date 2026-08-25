import { describe, it, expect } from 'vitest';
import {
  BEATS_PER_BAR,
  barFrames,
  loopFrames,
  loopSeconds,
  nextBarBoundary,
  quantiseSpan,
  compensate,
  reverbCeilingSeconds,
  SONGS,
  songBySlug,
} from '../../src/lib/practice-room/liveloop';

const RATES = [44100, 48000];

/** Loop length uses the COUNTED pulse — the half-time song is the reason that field exists. */
const loopOf = (s: (typeof SONGS)[number], sr: number) => loopFrames(s.countedBpm, s.bars, sr);

describe('frame lengths are integers, and a loop is a bar times a count', () => {
  it('loopFrames === barFrames * bars for every song at 44.1k and 48k', () => {
    for (const s of SONGS) {
      for (const sr of RATES) {
        const bar = barFrames(s.countedBpm, sr);
        expect(Number.isInteger(bar)).toBe(true);
        expect(loopOf(s, sr)).toBe(bar * s.bars);
      }
    }
  });

  it('the same tempo always yields the identical bar, so error cannot accumulate', () => {
    // Twenty passes of a 90.7bpm bar are twenty copies of one integer, not twenty roundings.
    const bar = barFrames(90.7, 44100);
    for (let i = 0; i < 20; i += 1) expect(barFrames(90.7, 44100)).toBe(bar);
  });

  it('bar length is at least one frame, so nextBarBoundary cannot divide by zero', () => {
    expect(barFrames(1e9, 44100)).toBe(1);
    expect(() => nextBarBoundary(10, 0, 1e9, 44100)).not.toThrow();
  });
});

describe('published loop lengths', () => {
  // These four figures are in the shipped field guide. A change here contradicts a document
  // that is already out, so the fix is the document or the measurement — not this assertion.
  const PUBLISHED: Record<string, number> = {
    apocalypse: 10.58,
    k: 10.40,
    'nothings-gonna-hurt-you-baby': 9.66,
    sunsetz: 12.45,
  };

  it.each(Object.entries(PUBLISHED))('%s loops in %s s', (slug, secs) => {
    const s = songBySlug(slug)!;
    expect(loopSeconds(s.countedBpm, s.bars)).toBeCloseTo(secs, 2);
    expect(Math.abs(loopSeconds(s.countedBpm, s.bars) - secs)).toBeLessThan(0.02);
  });

  it('frames and seconds agree to under a frame per bar', () => {
    for (const s of SONGS) {
      for (const sr of RATES) {
        const drift = Math.abs(loopOf(s, sr) - loopSeconds(s.countedBpm, s.bars) * sr);
        expect(drift).toBeLessThanOrEqual(s.bars * 0.5);
      }
    }
  });

  it('the half-time song counts fast: 9.66 s, not the 19.3 s the felt pulse would give', () => {
    const s = songBySlug('nothings-gonna-hurt-you-baby')!;
    expect(loopSeconds(s.countedBpm, s.bars)).toBeCloseTo(9.66, 2);
    expect(loopSeconds(s.bpm, s.bars)).toBeCloseTo(19.32, 2);
    expect(s.countedBpm).toBeCloseTo(s.bpm * 2, 6);
  });
});

describe('nextBarBoundary', () => {
  it('a press mid-bar rounds up to the next line', () => {
    const bar = barFrames(120, 48000); // 2 s of 4/4 = 96,000 frames
    expect(bar).toBe(96000);
    expect(nextBarBoundary(1, 0, 120, 48000)).toBe(bar);
    expect(nextBarBoundary(bar - 1, 0, 120, 48000)).toBe(bar);
    expect(nextBarBoundary(bar + 1, 0, 120, 48000)).toBe(2 * bar);
  });

  it('a press exactly on a line returns that line — it does not skip a bar', () => {
    const bar = barFrames(120, 48000);
    expect(nextBarBoundary(0, 0, 120, 48000)).toBe(0);
    expect(nextBarBoundary(bar, 0, 120, 48000)).toBe(bar);
    expect(nextBarBoundary(7 * bar, 0, 120, 48000)).toBe(7 * bar);
  });

  it('the grid is anchored on originFrame, not on frame 0', () => {
    const bar = barFrames(120, 48000);
    expect(nextBarBoundary(500, 500, 120, 48000)).toBe(500);
    expect(nextBarBoundary(501, 500, 120, 48000)).toBe(500 + bar);
  });

  it('extends backwards, so an early press quantises rather than clamping to the origin', () => {
    const bar = barFrames(120, 48000);
    expect(nextBarBoundary(-1, 0, 120, 48000)).toBe(0);
    expect(nextBarBoundary(-bar - 1, 0, 120, 48000)).toBe(-bar);
  });
});

describe('quantiseSpan', () => {
  it('a rough press mid-bar lands on the next line and spans exactly one loop', () => {
    const s = songBySlug('apocalypse')!;
    const bar = barFrames(s.countedBpm, 44100);
    const press = 3 * bar + 12345; // deep inside bar 4
    const span = quantiseSpan(press, 0, s.countedBpm, s.bars, 44100);
    expect(span.startFrame).toBe(4 * bar);
    expect(span.frames).toBe(loopOf(s, 44100));
    expect(span.endFrame - span.startFrame).toBe(span.frames);
    expect(span.startFrame).toBeGreaterThan(press);
  });

  it('a press exactly on a boundary starts there — no lost bar', () => {
    const s = songBySlug('sunsetz')!;
    const bar = barFrames(s.countedBpm, 48000);
    const span = quantiseSpan(2 * bar, 0, s.countedBpm, s.bars, 48000);
    expect(span.startFrame).toBe(2 * bar);
    expect(span.frames).toBe(loopOf(s, 48000));
  });

  it('every press inside one bar yields the same span — that is what makes it usable', () => {
    const s = songBySlug('k')!;
    const bar = barFrames(s.countedBpm, 44100);
    const spans = [1, 999, bar >> 1, bar - 1].map((p) => quantiseSpan(p, 0, s.countedBpm, s.bars, 44100));
    for (const sp of spans) {
      expect(sp.startFrame).toBe(bar);
      expect(sp.endFrame).toBe(bar + loopOf(s, 44100));
    }
  });

  it('spans stack end-to-start with no gap, so overdubs are contiguous', () => {
    const s = songBySlug('apocalypse')!;
    const a = quantiseSpan(10, 0, s.countedBpm, s.bars, 44100);
    const b = quantiseSpan(a.endFrame, 0, s.countedBpm, s.bars, 44100);
    expect(b.startFrame).toBe(a.endFrame);
  });
});

describe('compensate', () => {
  it('subtracts the measured round trip exactly', () => {
    expect(compensate(466768, 1024)).toBe(465744);
    expect(compensate(1000, 1)).toBe(999);
    expect(compensate(1000, 0)).toBe(1000);
  });

  it('clamps at 0 — the first bar keeps an uncompensated head rather than reading before the buffer', () => {
    expect(compensate(500, 1024)).toBe(0);
    expect(compensate(0, 4096)).toBe(0);
    expect(compensate(1024, 1024)).toBe(0);
  });
});

describe('reverbCeilingSeconds', () => {
  const CEILINGS: Record<string, number> = {
    apocalypse: 5.292,
    k: 5.200,
    'nothings-gonna-hurt-you-baby': 4.829,
    sunsetz: 6.226,
  };

  it.each(Object.entries(CEILINGS))('%s ceiling is %s s', (slug, secs) => {
    const s = songBySlug(slug)!;
    expect(reverbCeilingSeconds(loopSeconds(s.countedBpm, s.bars))).toBeCloseTo(secs, 2);
  });

  it('all four clear 4 s, so the 50%% doctrine does not bind at these tempos', () => {
    // A 2-6s hall preset fits under every one of these. The rule only bites on a one-bar
    // loop: one bar of Apocalypse is 2.65s, ceiling 1.32s, under the shortest hall.
    for (const s of SONGS) {
      expect(reverbCeilingSeconds(loopSeconds(s.countedBpm, s.bars))).toBeGreaterThan(4);
    }
    expect(reverbCeilingSeconds(loopSeconds(90.7, 1))).toBeLessThan(2);
  });

  it('is exactly half, at any length', () => {
    expect(reverbCeilingSeconds(10)).toBe(5);
    expect(reverbCeilingSeconds(0)).toBe(0);
  });
});

describe('control: the rival computations that would drift', () => {
  // 90.7bpm at 44100 divides into nothing tidy — 29,173.098 frames per beat — so the three
  // ways to get a 4-bar length disagree, and this pins which one shipped.
  //
  //   barFrames*bars       466,768   <- what loopFrames does
  //   round(secs * sr)     466,770   <- one round of the whole loop: +2 frames
  //   4 * 4 * round(beat)  466,768   <- coincides here; see the K. case below, where it is -8
  it('90.7bpm at 44100 gives exactly 116,692 frames a bar and 466,768 a loop', () => {
    expect(barFrames(90.7, 44100)).toBe(116692);
    expect(loopFrames(90.7, 4, 44100)).toBe(466768);
    expect(Number.isInteger(loopFrames(90.7, 4, 44100))).toBe(true);
  });

  it('differs from rounding the whole loop once — by 2 frames at 90.7, 2 at 92.3', () => {
    expect(Math.round(loopSeconds(90.7, 4) * 44100)).toBe(466770);
    expect(loopFrames(90.7, 4, 44100)).not.toBe(466770);
    expect(Math.round(loopSeconds(92.3, 4) * 44100)).toBe(458678);
    expect(loopFrames(92.3, 4, 44100)).toBe(458680);
  });

  it('differs from per-beat accumulation — 8 frames on K. at 44100', () => {
    const perBeat = Math.round((60 / 92.3) * 44100);
    const accumulated = perBeat * BEATS_PER_BAR * 4;
    expect(accumulated).toBe(458672);
    expect(loopFrames(92.3, 4, 44100)).toBe(458680);
    expect(loopFrames(92.3, 4, 44100) - accumulated).toBe(8);
  });

  it('48000 is not 44100 scaled — each rate rounds on its own', () => {
    expect(barFrames(90.7, 48000)).toBe(127012);
    expect(loopFrames(90.7, 4, 48000)).toBe(508048);
    expect(loopFrames(90.7, 4, 48000)).not.toBe(Math.round(loopFrames(90.7, 4, 44100) * (48000 / 44100)));
  });
});

describe('SONGS', () => {
  it('four songs, unique slugs, four chords each, all reachable by slug', () => {
    expect(SONGS).toHaveLength(4);
    expect(new Set(SONGS.map((s) => s.slug)).size).toBe(4);
    for (const s of SONGS) {
      expect(s.cell).toHaveLength(4);
      expect(s.bars).toBeGreaterThan(0);
      expect(Number.isInteger(s.bars)).toBe(true);
      expect(s.keyNote.length).toBeGreaterThan(0);
      expect(songBySlug(s.slug)).toBe(s);
    }
    expect(songBySlug('nope')).toBeUndefined();
  });

  it('countedBpm equals bpm except in half-time', () => {
    for (const s of SONGS) {
      if (s.slug === 'nothings-gonna-hurt-you-baby') expect(s.countedBpm).not.toBe(s.bpm);
      else expect(s.countedBpm).toBe(s.bpm);
    }
  });

  it('tempos carry the decimal the beat tracker reported, not a tidied integer', () => {
    // A whole number here means someone replaced a measurement with a guess.
    for (const s of SONGS) expect(Number.isInteger(s.bpm)).toBe(false);
  });
});
