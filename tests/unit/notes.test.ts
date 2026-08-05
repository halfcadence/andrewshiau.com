import { describe, it, expect } from 'vitest';
import {
  freqToMidi, midiToFreq, freqToReading, centsOff, A4_DEFAULT,
} from '../../src/lib/practice-room/notes';

describe('freqToMidi / midiToFreq', () => {
  it('A4 = 440 Hz = MIDI 69 at default calibration', () => {
    expect(freqToMidi(440)).toBeCloseTo(69, 10);
    expect(midiToFreq(69)).toBeCloseTo(440, 10);
  });

  it('round-trips across the range', () => {
    for (let midi = 21; midi <= 108; midi++) {
      expect(freqToMidi(midiToFreq(midi))).toBeCloseTo(midi, 8);
    }
  });

  it('an octave doubles frequency', () => {
    expect(midiToFreq(81)).toBeCloseTo(880, 8);
    expect(midiToFreq(57)).toBeCloseTo(220, 8);
  });

  it('calibration moves the whole grid: A4=442 puts 442 Hz at MIDI 69', () => {
    expect(freqToMidi(442, 442)).toBeCloseTo(69, 10);
    expect(midiToFreq(69, 442)).toBeCloseTo(442, 10);
  });
});

describe('freqToReading', () => {
  it('440 Hz reads A4, 0 cents', () => {
    const r = freqToReading(440)!;
    expect(r.name).toBe('A');
    expect(r.octave).toBe(4);
    expect(r.cents).toBeCloseTo(0, 6);
  });

  it('261.63 Hz reads C4', () => {
    const r = freqToReading(261.6256)!;
    expect(r.name).toBe('C');
    expect(r.octave).toBe(4);
    expect(Math.abs(r.cents)).toBeLessThan(0.01);
  });

  // DIRECTION — the assertion that catches a sign flip, which is the tuner bug
  // that matters most: a tuner that reads sharp as flat tunes every string the
  // wrong way with full confidence.
  it('446 Hz reads A4 SHARP (positive cents)', () => {
    const r = freqToReading(446)!;
    expect(r.name).toBe('A');
    expect(r.cents).toBeGreaterThan(20);
    expect(r.cents).toBeLessThan(28); // 446/440 = +23.44 cents
  });

  it('434 Hz reads A4 FLAT (negative cents)', () => {
    const r = freqToReading(434)!;
    expect(r.name).toBe('A');
    expect(r.cents).toBeLessThan(-20);
  });

  // THE CONTROL ARM: the same 446 Hz that read sharp at 440 reads dead-on when
  // the calibration itself is 446. If both move, the calibration is wired through;
  // if only one does, something is reading a stale A4.
  it('446 Hz at A4=446 reads 0 cents (calibration control)', () => {
    const r = freqToReading(446, 446)!;
    expect(r.name).toBe('A');
    expect(Math.abs(r.cents)).toBeLessThan(0.001);
  });

  it('rejects junk: 0, negative, NaN, Infinity, and the detector’s -1', () => {
    expect(freqToReading(0)).toBeNull();
    expect(freqToReading(-1)).toBeNull();
    expect(freqToReading(NaN)).toBeNull();
    expect(freqToReading(Infinity)).toBeNull();
  });

  it('cents is bounded ±50 for any frequency (nearest note)', () => {
    for (const f of [27.5, 100, 333, 440, 1234.5, 4186]) {
      const r = freqToReading(f)!;
      expect(Math.abs(r.cents)).toBeLessThanOrEqual(50);
    }
  });

  it('names wrap correctly across octaves: E2 for a low guitar string', () => {
    const r = freqToReading(82.4069)!;
    expect(r.name).toBe('E');
    expect(r.octave).toBe(2);
  });
});

describe('centsOff', () => {
  it('is signed and symmetric around the target', () => {
    expect(centsOff(440, 69)).toBeCloseTo(0, 8);
    expect(centsOff(446, 69, A4_DEFAULT)).toBeGreaterThan(0);
    expect(centsOff(434, 69, A4_DEFAULT)).toBeLessThan(0);
  });
});
