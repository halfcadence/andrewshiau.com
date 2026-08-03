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
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
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
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(out, name), Buffer.concat([header, data]));
  console.log(`wrote ${name}: ${freq} Hz, ${seconds}s`);
}

wav(440, 20, 'sine-440.wav');   // A4 dead on at standard calibration
wav(446, 20, 'sine-446.wav');   // ~23.4 cents sharp of A4 — the direction case
wav(196, 20, 'sine-196.wav');   // G3 — a different note name entirely
