#!/usr/bin/env python3
"""Build the drone's cello loops from the CC0 source recordings.

Regenerates `public/practice-room/cello.bin` + `cello.json`. Run only when the recipe
changes — the output is committed, because a build must not depend on GitHub being up.

    python3 scripts/build-cello-samples.py ~/Downloads/vsco-cello/

SOURCE: VSCO-2 Community Edition (github.com/sgossner/VSCO-2-CE), CC0 1.0 / public domain,
`Strings/Cello Section/susvib/susvib_<NOTE>_v3_1.wav`. A cello SECTION and not a soloist,
deliberately: many players' vibrato beating against each other is most of what makes a cello
drone sound lush rather than like one held note.

THREE NOTES, A CHAIN OF FIFTHS (A2 · E3 · B3). The stack reaches a major 10th above the root
(+16 semitones) and the root itself ranges over two octaves, so one sample would be stretched
past the point where a cello still sounds like one. With three, `nearestSample()` keeps every
pitch within 3 semitones of a real recording and takes the rest in whole octaves, which a
sustained bowed string tolerates.

WHY ONE .bin AND NOT THREE .wav FILES: one request, no header parsing, and no
`decodeAudioData` (async, so the first press of the drone would arrive late). The page reads
raw little-endian int16 straight into an AudioBuffer. `cello.json` carries the offsets.

WHY MONO / 16-BIT / 22.05 kHz: a sustained note has no transient needing 24 bits of headroom
and nothing above 11 kHz that a drone depends on. 3 MB of source becomes 88 kB per note.
"""
import audioop
import json
import math
import struct
import sys
import wave
from pathlib import Path

OUT_RATE = 22050
LOOP_SEC = 2.0
XFADE_SEC = 0.25
REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / 'public' / 'practice-room'

# name → (source filename, THE PITCH THE LOOP ACTUALLY SOUNDS, as MIDI, and its detune in CENTS)
#
# BOTH NUMBERS ARE MEASURED OFF THE BUILT LOOP, never taken from the filename. `measure_pitch()`
# below recomputes them on every build and FAILS if the table is stale, because both errors this
# table exists to correct were inaudible to every automated check that existed at the time.
#
# 1 — THE OCTAVE. The MIDI values are one octave above the filenames. The user heard it ("the
#     cello section sound an octave above the rest of the things") and the measurement agreed:
#     the `A2` loop sounds 221 Hz, which is A3. `playbackRate = target / midiToFreq(stated)`, so
#     a stated pitch an octave low makes every rate 2× and the whole drone plays an octave high —
#     while every INTERVAL stays exactly just, because a constant factor on all ranks leaves
#     rank/root untouched. That is why the e2e ratio assertions and the live check both passed.
#     A ratio test cannot catch a transposition; only an absolute one can.
#
# 2 — THE CENTS, and the story here is a warning about instruments, not about cellos.
#     The samples are very nearly in tune: A2 −4.0¢, E3 +3.3¢, B3 +2.5¢. The offsets are stored
#     and divided out anyway, because the spread of a RECORDING must not become the pitch of an
#     INSTRUMENT a player tunes to — but they are small, and the interesting part is that I twice
#     believed they were not.
#
#     THREE DETECTORS, TWO OF THEM WRONG, and each was wrong in a way that would have DAMAGED
#     the thing it was measuring:
#       · NSDF peak + parabola (lag domain) → claimed B3 was 27.5¢ FLAT. I shipped that
#         "correction", which detuned B3 by 30 cents in the opposite direction. Calibrated
#         against known tones afterwards: biased up to 11.4¢, and the bias SWINGS with frequency
#         (+11¢ at 247 Hz, −9¢ at 131 Hz). At 220 Hz the period is 100.2 samples, so one sample
#         of lag error is 17 cents — the answer rode entirely on interpolating three integer
#         lags, and a parabola is not the shape of an NSDF peak.
#       · Phase advance over a long baseline → exact when the seed was good (220.000 Hz) and
#         +14¢ wrong at 486 Hz, because it needs the seed to pick the right CYCLE. A method with
#         a cliff edge is not a measuring instrument.
#       · Spectral-peak search (ternary search maximising summed harmonic magnitude) → 0.000¢
#         on seven known inputs from 131 to 486 Hz. No lag quantisation, no integer ambiguity.
#
#     THE LESSON, and it is why `measure_pitch()` now carries its own self-check: an instrument
#     used to correct a measurement must be calibrated against a known value FIRST. The tell was
#     available and I nearly missed it — the organ voice is pure oscillators at exactly 220.000
#     Hz and the detector read 221.0, which was the detector confessing, not the organ drifting.
NOTES = [('A2', 'susvib_A2_v3_1.wav', 57, -4.0),
         ('E3', 'susvib_E3_v3_1.wav', 64, 3.3),
         ('B3', 'susvib_B3_v3_1.wav', 71, 2.5)]

# how far a build may drift from the table before it is a bug rather than noise. 1.5¢ rather
# than the 3.0 the biased detector needed: the calibrated one is exact to 0.001¢ on synthetic
# input, so anything past a cent and a half is a real change in the audio.
CENT_TOLERANCE = 1.5


def read_mono_22k(path):
    w = wave.open(str(path), 'rb')
    ch, width, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = w.readframes(n)
    w.close()
    if ch == 2:
        raw = audioop.tomono(raw, width, 0.5, 0.5)
    if width != 2:
        raw = audioop.lin2lin(raw, width, 2)
    raw, _ = audioop.ratecv(raw, 2, 1, rate, OUT_RATE, None)
    return list(struct.unpack(f'<{len(raw) // 2}h', raw))


def find_sustain(s):
    """First frame at 70% of peak RMS, plus 0.35 s clearance.

    The attack is where a bowed note is noisiest and least periodic, so a loop containing any
    of it loops the SCRAPE once per cycle — the most audible flaw a drone can have.
    """
    win = OUT_RATE // 40
    env = []
    for i in range(0, len(s) - win, win):
        acc = 0
        for v in s[i:i + win]:
            acc += v * v
        env.append(math.sqrt(acc / win))
    peak = max(env)
    idx = next(i for i, v in enumerate(env) if v >= 0.70 * peak)
    return idx * win + int(0.35 * OUT_RATE)


def build_loop(s, start):
    """Crossfade the tail over the head so the wrap-around is not a step.

    EQUAL POWER (cos/sin), not linear: two decorrelated stretches of a string section sum in
    power, so a linear fade loses 3 dB in the middle and you hear the seam as a pulse once
    every two seconds.
    """
    n, x = int(LOOP_SEC * OUT_RATE), int(XFADE_SEC * OUT_RATE)
    if start + n + x > len(s):
        start = max(0, len(s) - n - x)
    body, tail = s[start:start + n], s[start + n:start + n + x]
    for i in range(x):
        t = (i + 0.5) / x
        body[i] = int(max(-32768, min(32767,
                     body[i] * math.sin(t * math.pi / 2) + tail[i] * math.cos(t * math.pi / 2))))
    return body


def seam(loop):
    """The wrap-around step, against the loop's own typical step.

    "Seamless" has to mean something checkable: the join must be no bigger a jump than the
    ordinary sample-to-sample motion inside the loop.
    """
    steps = sorted(abs(loop[i + 1] - loop[i]) for i in range(0, len(loop) - 1, 7))
    return abs(loop[0] - loop[-1]), steps[len(steps) // 2], steps[int(len(steps) * 0.95)]


def _harmonic_power(w, f, harmonics=3):
    """Summed |DFT| at f, 2f, 3f over a Hann-windowed frame — the search's objective.

    Hann because a rectangular window's sidelobes put ripple on the objective, and ripple gives
    a hill-climbing search false summits to stop on.
    """
    total = 0.0
    n = len(w)
    for h in range(1, harmonics + 1):
        om = 2 * math.pi * f * h / OUT_RATE
        re = im = 0.0
        for i in range(n):
            v = w[i] * (0.5 - 0.5 * math.cos(2 * math.pi * i / (n - 1)))
            re += v * math.cos(om * i)
            im -= v * math.sin(om * i)
        total += math.sqrt(re * re + im * im) / h
    return total


def _coarse(loop):
    """A bracket, good to well within a semitone. The search does the precision."""
    mean = sum(loop) / len(loop)
    s = [v - mean for v in loop]
    min_lag, max_lag = int(OUT_RATE / 700), int(OUT_RATE / 60)
    w = s[2000:2000 + 8000 + max_lag]
    best_v, best_lag, vals = -2.0, min_lag, {}
    for lag in range(min_lag, max_lag):
        ac = norm = 0.0
        for i in range(0, len(w) - max_lag, 2):
            a, b = w[i], w[i + lag]
            ac += a * b
            norm += a * a + b * b
        v = 2 * ac / norm if norm else 0.0
        vals[lag] = v
        if v > best_v:
            best_v, best_lag = v, lag
    lag = best_lag
    for L in range(min_lag + 1, max_lag - 1):
        if vals[L] >= 0.85 * best_v and vals[L] >= vals[L - 1] and vals[L] >= vals[L + 1]:
            lag = L
            break
    return OUT_RATE / lag


def measure_pitch(loop):
    """The loop's fundamental in Hz, accurate to a thousandth of a cent.

    Ternary search maximising the summed magnitude of the first three harmonics. Chosen after
    two biased alternatives (see the NOTES comment): this one has no lag quantisation and no
    integer ambiguity, so there is no mechanism for a frequency-dependent bias.
    """
    mean = sum(loop) / len(loop)
    sig = [v - mean for v in loop]
    seed = _coarse(loop)
    n = min(len(sig) - 2000, int(0.3 * OUT_RATE))
    w = sig[2000:2000 + n]
    lo, hi = seed * 2 ** (-1 / 12), seed * 2 ** (1 / 12)
    for _ in range(46):
        m1 = lo + (hi - lo) / 3
        m2 = hi - (hi - lo) / 3
        if _harmonic_power(w, m1) < _harmonic_power(w, m2):
            lo = m1
        else:
            hi = m2
    return (lo + hi) / 2


def self_check():
    """CALIBRATE THE INSTRUMENT BEFORE USING IT — this is not optional here.

    A biased detector already shipped a 30-cent detune into the live drone: it reported the B3
    loop as 27.5¢ flat when it is 2.5¢ sharp, and the "correction" moved the pitch by the size of
    the error. Synthetic tones of known pitch cost two seconds and would have caught it before
    anyone heard it, so the build refuses to run without them.
    """
    worst = 0.0
    for f0 in (220.0, 246.94, 329.63, 486.11):
        n = int(OUT_RATE * 1.0)
        s = []
        for i in range(n):
            t = i / OUT_RATE
            s.append(int(8000 * (math.sin(2 * math.pi * f0 * t)
                                 + 0.42 * math.sin(2 * math.pi * 2 * f0 * t)
                                 + 0.62 * math.sin(2 * math.pi * 3 * f0 * t))))
        err = abs(1200 * math.log2(measure_pitch(s) / f0))
        worst = max(worst, err)
        print(f'  calibrate {f0:>7.2f}Hz → {err:+.4f}¢')
    assert worst < 0.5, f'the detector is biased by up to {worst:.2f}¢ — do not trust its output'
    print(f'  detector verified: worst {worst:.4f}¢ over 220–486 Hz\n')


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp')
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    self_check()
    blob, meta, off = bytearray(), [], 0
    for name, fn, midi, cents in NOTES:
        path = src / fn
        if not path.exists():                      # accept the /tmp working names too
            alt = src / f'vsco-{name}{"-v3" if name == "A2" else ""}.wav'
            path = alt if alt.exists() else path
        loop = build_loop(s := read_mono_22k(path), find_sustain(s))
        pk = max(abs(v) for v in loop)
        g = (0.89 * 32767) / pk
        loop = [int(max(-32768, min(32767, round(v * g)))) for v in loop]
        step, med, p95 = seam(loop)
        assert step <= p95, f'{name}: the loop seam ({step}) jumps more than 95% of the loop ({p95})'

        # THE TABLE IS VERIFIED AGAINST THE AUDIO, every build. A hand-maintained pitch table
        # drifts the moment the source or the loop window changes, and a wrong entry is
        # inaudible-until-it-isn't: the whole voice plays flat and every ratio test still passes.
        f = measure_pitch(loop)
        m = 69 + 12 * math.log2(f / 440.0)
        got_midi = int(round(m))
        got_cents = (m - got_midi) * 100
        assert got_midi == midi, (
            f'{name}: table says midi {midi}, the audio says {got_midi} '
            f'({f:.2f} Hz) — fix the table, not this assert')
        assert abs(got_cents - cents) <= CENT_TOLERANCE, (
            f'{name}: table says {cents:+.1f}¢, the audio says {got_cents:+.1f}¢ '
            f'(tolerance {CENT_TOLERANCE}¢)')

        raw = struct.pack(f'<{len(loop)}h', *loop)
        blob += raw
        meta.append({'name': name, 'midi': midi, 'cents': cents,
                     'byteOffset': off, 'frames': len(loop)})
        off += len(raw)
        print(f'{name}: {len(loop) / OUT_RATE:.2f}s · {f:.2f}Hz = midi {got_midi} '
              f'{got_cents:+.1f}¢ (table {cents:+.1f}¢) · seam {step} vs p95 {p95} '
              f'· {len(raw) / 1024:.0f} kB')
    (OUT_DIR / 'cello.bin').write_bytes(blob)
    (OUT_DIR / 'cello.json').write_text(json.dumps(
        {'rate': OUT_RATE, 'notes': meta,
         'source': 'VSCO-2 Community Edition (CC0) — Cello Section, sustain vibrato'}) + '\n')
    print(f'→ public/practice-room/cello.bin  {len(blob) / 1024:.0f} kB')


if __name__ == '__main__':
    main()
