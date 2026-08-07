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

# name → (source filename, the note's real pitch as MIDI)
NOTES = [('A2', 'susvib_A2_v3_1.wav', 45),
         ('E3', 'susvib_E3_v3_1.wav', 52),
         ('B3', 'susvib_B3_v3_1.wav', 59)]


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


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp')
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    blob, meta, off = bytearray(), [], 0
    for name, fn, midi in NOTES:
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
        raw = struct.pack(f'<{len(loop)}h', *loop)
        blob += raw
        meta.append({'name': name, 'midi': midi, 'byteOffset': off, 'frames': len(loop)})
        off += len(raw)
        print(f'{name}: {len(loop) / OUT_RATE:.2f}s · seam {step} vs median {med} / p95 {p95} '
              f'· {len(raw) / 1024:.0f} kB')
    (OUT_DIR / 'cello.bin').write_bytes(blob)
    (OUT_DIR / 'cello.json').write_text(json.dumps(
        {'rate': OUT_RATE, 'notes': meta,
         'source': 'VSCO-2 Community Edition (CC0) — Cello Section, sustain vibrato'}) + '\n')
    print(f'→ public/practice-room/cello.bin  {len(blob) / 1024:.0f} kB')


if __name__ == '__main__':
    main()
