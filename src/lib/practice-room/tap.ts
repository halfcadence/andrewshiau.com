// Tap tempo. Pure state machine over timestamps passed in — the page passes
// performance.now(), the tests pass literals.
//
// Averages the last WINDOW intervals; a pause longer than maxGapMs starts a new
// phrase rather than polluting the average with the silence.

const WINDOW = 6;

export interface TapTempo {
  tap(nowMs: number): number | null; // BPM after ≥2 taps in a phrase, else null
  reset(): void;
}

export function createTapTempo(maxGapMs = 2000): TapTempo {
  let taps: number[] = [];
  return {
    tap(nowMs: number): number | null {
      if (taps.length > 0 && nowMs - taps[taps.length - 1] > maxGapMs) taps = [];
      taps.push(nowMs);
      if (taps.length < 2) return null;
      const recent = taps.slice(-WINDOW);
      const avgInterval = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
      if (avgInterval <= 0) return null;
      return Math.round(60000 / avgInterval);
    },
    reset() { taps = []; },
  };
}
