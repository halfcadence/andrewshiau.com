// Generate the fake-microphone fixtures: mono 16-bit 48 kHz WAVs of known sines.
// Chromium's --use-file-for-fake-audio-capture plays one of these in place of a
// real microphone, which is what makes the tuner's e2e assertions possible: the
// input frequency is KNOWN, so the reading has a truth to be checked against.
//
// Run by the e2e npm script before Playwright; deterministic, so the files are
// gitignored build artifacts rather than committed binaries.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'fixtures');
mkdirSync(out, { recursive: true });

const SR = 48000;

function wav(freq, seconds, name) {
  const n = Math.round(SR * seconds);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    // -6 dBFS, with a 50 ms fade-in so the file doesn't open on a click.
    const env = Math.min(1, i / (SR * 0.05));
    const s = 0.5 * env * Math.sin((2 * Math.PI * freq * i) / SR);
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  writeFileSync(join(out, name), Buffer.concat([wavHeader(data.length), data]));
  console.log(`wrote ${name}: ${freq} Hz, ${seconds}s`);
}

function wavHeader(dataLength) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);        // PCM chunk size
  header.writeUInt16LE(1, 20);         // PCM
  header.writeUInt16LE(1, 22);         // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);    // byte rate
  header.writeUInt16LE(2, 32);         // block align
  header.writeUInt16LE(16, 34);        // bits
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

// A PLAYED NOTE, NOT A TEST TONE: 1.2s of A4 then 1.8s of room, repeating. This is the
// fixture the bleed test needs, because the bug lives in the GAPS — a continuous sine
// masks the click (the detector follows the louder, longer signal), so a steady tone
// cannot show the symptom the user reported. Between notes there is nothing to mask it
// and the click is the only pitch in the window.
function pulsedWav(freq, seconds, name, onSec = 1.2, offSec = 1.8) {
  const n = Math.round(SR * seconds);
  const data = Buffer.alloc(n * 2);
  const period = onSec + offSec;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const inCycle = t % period;
    let s = 0;
    if (inCycle < onSec) {
      // 20ms attack, 80ms release — a bowed/plucked note, not a gate click
      const env = Math.min(1, inCycle / 0.02, Math.max(0, (onSec - inCycle) / 0.08));
      s = 0.5 * env * Math.sin(2 * Math.PI * freq * t);
    }
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  writeFileSync(join(out, name), Buffer.concat([wavHeader(data.length), data]));
  console.log(`wrote ${name}: ${freq} Hz pulsed ${onSec}s on / ${offSec}s off, ${seconds}s`);
}

// A PHRASE, for /pitchgraph/ — the page whose whole subject is what happens between
// notes, which a single sustained tone cannot exercise at all. Four notes with a rest
// between each, every one held at a DIFFERENT known offset, so the per-note panels have
// four different truths to be checked against rather than one.
//
// The offsets are the point: a page that reports one mean for a whole phrase would call
// this player in tune (the four average to about +1¢) while every note is wrong. That is
// the averaging trap the panels exist to defeat, so the fixture has to contain it.
//
// Rests are 400 ms — comfortably past the page's 250 ms silence hold, so each note
// genuinely closes and prints. Notes are 1.2 s, long enough that centre-weighting has a
// middle to weight.
function phraseWav(name, notes, restSec = 0.4, noteSec = 1.2, repeats = 6) {
  const perNote = Math.round(SR * (noteSec + restSec));
  const one = repeats * notes.length * perNote;
  const data = Buffer.alloc(one * 2);
  let w = 0;
  for (let rep = 0; rep < repeats; rep++) {
    for (const freq of notes) {
      const nOn = Math.round(SR * noteSec);
      for (let i = 0; i < nOn; i++) {
        const t = i / SR;
        // A short attack and release so the detector sees a real onset rather than a
        // click, and so the first read is not a transient.
        const env = Math.min(1, t / 0.05, (noteSec - t) / 0.05);
        const s = 0.5 * Math.max(0, env) * Math.sin(2 * Math.PI * freq * t);
        data.writeInt16LE(Math.round(s * 32767), w * 2); w++;
      }
      for (let i = 0; i < Math.round(SR * restSec); i++) { data.writeInt16LE(0, w * 2); w++; }
    }
  }
  writeFileSync(join(out, name), Buffer.concat([wavHeader(w * 2), data.subarray(0, w * 2)]));
  console.log(`wrote ${name}: ${notes.length} notes x ${repeats}, ${noteSec}s on / ${restSec}s off`);
}

// A SLURRED PAIR — two notes with NO silence between them, which is the case that
// separates a segmenter that works on phrases from one that only works on isolated notes.
//
// Why this exists: `phrase-4.wav` puts a rest around every note, and that is exactly the
// case where even a naive "lock the note at the attack" mechanism is right. Swapping the
// page's segmenter for `attack-lock` — the wrong one for phrases — passed the whole suite.
// A fixture that cannot distinguish the right mechanism from the wrong one is not testing
// the mechanism. This one can: with no rest to reset on, attack-lock measures the second
// note against the first and pins the reading off the ±50 scale.
//
// A4 +20¢ held, then a 60 ms glide up to B4 −18¢ held. The glide is short on purpose —
// long enough to be a slur rather than a click, short enough that it is not itself a note.
function slurWav(name, fromHz, toHz, holdSec = 1.1, glideSec = 0.06, restSec = 0.5, repeats = 6) {
  const chunks = [];
  let total = 0;
  const push = (n, fn) => {
    const b = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(fn(i, n) * 32767), i * 2);
    chunks.push(b); total += n;
  };
  // Phase is integrated across the whole take so the glide is a real frequency sweep and
  // the joins have no discontinuity — a phase jump reads as a click, which is an onset,
  // which would hand the segmenter the very cue this fixture is meant to withhold.
  let phase = 0;
  const step = (f) => { phase += (2 * Math.PI * f) / SR; return phase; };
  for (let rep = 0; rep < repeats; rep++) {
    push(Math.round(SR * holdSec), (i, n) => {
      const env = Math.min(1, i / (SR * 0.05), (n - i) / (SR * 0.05));
      return 0.5 * Math.max(0, env) * Math.sin(step(fromHz));
    });
    push(Math.round(SR * glideSec), (i, n) =>
      0.5 * Math.sin(step(fromHz + (toHz - fromHz) * (i / n))));
    push(Math.round(SR * holdSec), (i, n) => {
      const env = Math.min(1, i / (SR * 0.05), (n - i) / (SR * 0.05));
      return 0.5 * Math.max(0, env) * Math.sin(step(toHz));
    });
    push(Math.round(SR * restSec), () => 0);
  }
  writeFileSync(join(out, name), Buffer.concat([wavHeader(total * 2), ...chunks]));
  console.log(`wrote ${name}: slur ${fromHz.toFixed(1)} → ${toHz.toFixed(1)} Hz, `
    + `${glideSec * 1000}ms glide, x${repeats}`);
}

// The four offsets, computed rather than eyeballed: A4 +20¢, B4 −18¢, C#5 +12¢, D5 −6¢.
const cents = (base, c) => base * 2 ** (c / 1200);

wav(440, 20, 'sine-440.wav');   // A4 dead on at standard calibration
wav(446, 20, 'sine-446.wav');   // ~23.4 cents sharp of A4 — the direction case
wav(196, 20, 'sine-196.wav');   // G3 — a different note name entirely
pulsedWav(440, 30, 'pulse-440.wav'); // A4 played in phrases — the bleed test's input
slurWav('slur-a4-b4.wav', cents(440.0, 20), cents(493.88, -18));
phraseWav('phrase-4.wav', [
  cents(440.0, 20),    // A4  +20¢ sharp
  cents(493.88, -18),  // B4  −18¢ flat
  cents(554.37, 12),   // C♯5 +12¢ sharp
  cents(587.33, -6),   // D5  −6¢ flat
]);
