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
# 2 — THE CENTS, which is the subtler half and would have shipped without this pass. Rounding
#     each sample to the nearest semitone leaves the remainder as a PERMANENT detune on every
#     note that sample plays. Measured: A2 +7.8¢, E3 −5.0¢, and B3 **−27.5¢** — a quarter of a
#     semitone flat. On a drone whose entire purpose is that a player tunes to it, that is not a
#     rounding error, it is a wrong answer. So the offset is stored and the page divides it out.
#     (A section of players is not a tuning fork; some spread is real. It still has to be
#     removed, because the spread of the RECORDING must not become the pitch of the INSTRUMENT.)
#
# The first crude detector reported 227.3 Hz for A2 (+57¢) — wrong, and wrong in a way that
# would have introduced the very error it was looking for. Sub-sample parabolic interpolation
# over nine windows, taking the median, says 220.99. A measurement used to correct a pitch needs
# to be finer than the thing it is correcting.
NOTES = [('A2', 'susvib_A2_v3_1.wav', 57, 7.8),
         ('E3', 'susvib_E3_v3_1.wav', 64, -5.0),
         ('B3', 'susvib_B3_v3_1.wav', 71, -27.5)]

# how far a build may drift from the table before it is a bug rather than noise
CENT_TOLERANCE = 3.0


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


def measure_pitch(loop):
    """The loop's fundamental, in Hz, to better than a cent.

    NSDF with first-key-maximum picking (a plain ACF peak lands on a multiple of the period as
    often as on the period) plus parabolic interpolation — a whole-sample lag at 220 Hz is a
    10-cent grid, far too coarse to certify a pitch. Median of nine windows so one noisy patch
    cannot move the answer.
    """
    mean = sum(loop) / len(loop)
    s = [v - mean for v in loop]
    min_lag, max_lag = int(OUT_RATE / 700), int(OUT_RATE / 60)
    ests = []
    for k in range(9):
        start = 2000 + k * ((len(s) - max_lag - 6000) // 9)
        w = s[start:start + 6000 + max_lag]
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
        y0, y1, y2 = vals.get(lag - 1, vals[lag]), vals[lag], vals.get(lag + 1, vals[lag])
        d = 2 * (2 * y1 - y0 - y2)
        if y1 > 0.5:
            ests.append(OUT_RATE / (lag + ((y0 - y2) / d if d else 0.0)))
    ests.sort()
    return ests[len(ests) // 2]


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp')
    OUT_DIR.mkdir(parents=True, exist_ok=True)
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
