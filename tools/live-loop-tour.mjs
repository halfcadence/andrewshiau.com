// WALK THE LIVE LOOP LIKE A PLAYER, AND PHOTOGRAPH EACH STEP.
//
// Two jobs in one pass, deliberately: it produces the tutorial's screenshots AND it is the
// usability test, because the only way to find out whether an instrument can be used is to use
// it in order and write down what it told you at each step. Every shot is the CASE, not the
// viewport — the tutorial is about the instrument, not about the browser chrome.
//
// The fake microphone is a launch flag, so this script owns its own browser rather than running
// inside the Playwright projects: `--use-file-for-fake-audio-capture` with a real sine, because a
// lane recorded from silence still reports that it holds audio and the tour would photograph a
// looper that does not work.
//
// Run against a loopback preview (never 0.0.0.0 — CLAUDE.md rule 1):
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321
//   TOUR_URL=http://127.0.0.1:4321/practice-room/live-loop/ node tools/live-loop-tour.mjs out/
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const URL_ = process.env.TOUR_URL || 'http://127.0.0.1:4321/practice-room/live-loop/';
const OUT = process.argv[2] || '/tmp/ll-tour';
const WAV = fileURLToPath(new URL('../tests/e2e/fixtures/sine-440.wav', import.meta.url));

await mkdir(OUT, { recursive: true });
const log = [];
const note = (s) => { log.push(s); console.log(s); };

const browser = await chromium.launch({
  args: [
    '--no-sandbox', '--disable-gpu',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    `--use-file-for-fake-audio-capture=${WAV}`,
  ],
});

try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);   // shoot the real face, not a fallback

  const state = () => page.getByTestId('ll-state').textContent();
  // FRAME THE INSTRUMENT, NOT THE CASE. The case is the full height of the room's row ladder,
  // which on this route is mostly air — a screenshot of it is 60% empty paper and unreadable at
  // any width a document will show it. So the clip is the UNION of the rows that carry marks,
  // computed from the DOM rather than hardcoded, with one lead of padding. Same pixels, framed.
  // A single rectangle cannot remove INTERIOR air, and `.mt-mid` is the ladder's tall figure row,
  // so clipping to "the rows that carry marks" still framed 60% empty paper. The step-by-step
  // frame is therefore the lanes and their reading — the marks that actually change — and the
  // spec row, state line and foot get one shot each for orientation. The state line is a
  // SENTENCE, and a photograph of a sentence is worse than the sentence, so it is quoted as text.
  const shot = async (name, sel = ['.mt-liveloop .mt-lllanes', '.mt-liveloop .mt-read']) => {
    await page.waitForTimeout(120);
    const clip = await page.evaluate((sel) => {
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      for (const s of sel) {
        const el = document.querySelector(s);
        if (!el) continue;
        const q = el.getBoundingClientRect();
        if (q.width < 1 || q.height < 1) continue;
        l = Math.min(l, q.left); t = Math.min(t, q.top);
        r = Math.max(r, q.right); b = Math.max(b, q.bottom);
      }
      const pad = 18;
      return {
        x: Math.max(0, l - pad), y: Math.max(0, t - pad),
        width: Math.min(window.innerWidth, r + pad) - Math.max(0, l - pad),
        height: Math.min(window.innerHeight, b + pad) - Math.max(0, t - pad),
      };
    }, sel);
    await page.screenshot({ path: `${OUT}/${name}.png`, clip });
    note(`  [shot] ${name}.png  ${Math.round(clip.width)}x${Math.round(clip.height)}`);
  };
  // What a player can actually see and press, right now.
  const survey = async (label) => {
    const s = await page.evaluate(() => {
      const vis = (el) => !!el && el.getBoundingClientRect().width > 0;
      const btn = (id) => {
        const el = document.getElementById(id);
        return el ? { text: el.textContent.trim(), pressed: el.getAttribute('aria-pressed'), disabled: el.disabled === true } : null;
      };
      return {
        length: document.querySelector('[data-testid=ll-length]')?.textContent,
        right: document.querySelector('#mt-ll-pos')?.textContent,
        latency: document.querySelector('[data-testid=ll-latency]')?.textContent,
        run: btn('mt-ll-run'), click: btn('mt-ll-click'), undo: btn('mt-ll-undo'), mon: btn('mt-ll-mon'),
        lanes: [...document.querySelectorAll('.mt-lllane')].map((r) => ({
          name: r.querySelector('.mt-llnm')?.textContent,
          rec: r.querySelector('.mt-llrec')?.textContent.trim(),
          has: r.dataset.has, armed: r.dataset.armed, rec_on: r.dataset.rec,
          muted: r.dataset.muted, peak: r.dataset.peak,
        })),
        grid: {
          bpm: document.querySelector('#mt-ll-bpm')?.value,
          meter: [...document.querySelectorAll('#mt-ll-meter [data-meter]')].find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent,
          bars: [...document.querySelectorAll('#mt-ll-bars [data-bars]')].find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent,
        },
        section: [...document.querySelectorAll('#mt-ll-sect [data-section]')].map((b) => ({
          n: b.textContent.trim(), on: b.getAttribute('aria-pressed'), pending: b.dataset.pending, used: b.dataset.used,
        })),
        bleed: document.querySelector('.mt-liveloop')?.dataset.bleed ?? null,
        sounding: document.querySelector('.mt-liveloop')?.dataset.sounding ?? null,
        headVisible: vis(document.querySelector('.mt-llhead')),
      };
    });
    note(`\n=== ${label}`);
    note(`  says: "${(await state()).trim()}"`);
    note(`  reading ${s.length} · right rail "${s.right}" · latency ${s.latency} · sounding=${s.sounding} bleed=${s.bleed}`);
    note(`  run=${JSON.stringify(s.run)} click=${JSON.stringify(s.click)} undo=${JSON.stringify(s.undo)} mon=${JSON.stringify(s.mon)}`);
    for (const l of s.lanes) {
      note(`  lane ${l.name.padEnd(8)} btn=${l.rec.padEnd(4)} has=${l.has} armed=${l.armed} rec=${l.rec_on} muted=${l.muted} peak=${l.peak}`);
    }
    note(`  grid: ${s.grid.bpm} bpm · ${s.grid.meter} · ${s.grid.bars}`);
    note(`  sections: ${s.section.map((x) => `${x.n}${x.on === 'true' ? '*' : ''}${x.pending === 'true' ? '→' : ''}${x.used === 'true' ? '·' : ''}`).join(' ')}`);
    return s;
  };

  // ── 1. arrive
  await survey('1 — you arrive. Nothing is running and the microphone is not open.');
  await shot('01-arrive');
  await shot('00-song-row', ['.mt-liveloop .mt-np', '.mt-liveloop .mt-ctop']);
  await shot('00-foot', ['.mt-liveloop .mt-cfoot']);

  // ── 2. run: this is what opens the microphone
  await page.getByTestId('ll-bars-1').click();     // one bar, so the tour is not a coffee break
  await shot('01b-grid', ['.mt-liveloop .mt-np', '.mt-liveloop .mt-ctop']);
  await page.getByTestId('ll-run').click();
  await page.waitForFunction(() => document.querySelector('.mt-liveloop')?.dataset.sounding === 'true', null, { timeout: 20000 });
  await survey('2 — run. The mic opens, the click starts, the loop is turning.');
  await shot('02-running');

  // ── 3. punch a lane: armed, waiting for the bar line
  await page.getByTestId('ll-rec-1').click();
  await page.waitForFunction(() => document.querySelector('.mt-lllane[data-lane="1"]')?.dataset.armed === 'true', null, { timeout: 8000 });
  await survey('3 — press rec on a lane. It is ARMED and waits for the next bar.');
  await shot('03-armed');

  // ── 4. it is recording
  await page.waitForFunction(() => document.querySelector('.mt-lllane[data-lane="1"]')?.dataset.rec === 'true', null, { timeout: 20000 });
  await survey('4 — the bar line arrived. It is recording, and the strip fills.');
  await shot('04-recording');

  // ── 5. the take printed
  await page.waitForFunction(() => document.querySelector('.mt-lllane[data-lane="1"]')?.dataset.has === 'true', null, { timeout: 30000 });
  const printed = await survey('5 — one loop later the take is printed, with its PEAK.');
  await shot('05-printed');
  if (Number(printed.lanes[1].peak) <= 0.01) note('  !! USABILITY/CORRECTNESS: the take printed silence');
  if (printed.lanes[1].rec !== 'add') note('  !! USABILITY: the button should now read "add" (it overdubs from here)');

  // ── 6. a second lane, so there is an arrangement to mute
  await page.getByTestId('ll-rec-2').click();
  await page.waitForFunction(() => document.querySelector('.mt-lllane[data-lane="2"]')?.dataset.has === 'true', null, { timeout: 30000 });
  await survey('6 — a second lane. Two lanes hold audio; the others are still empty.');
  await shot('06-two-lanes');

  // ── 7. mute: the arrangement move
  await page.getByTestId('ll-mute-1').click();
  await page.waitForTimeout(200);
  await survey('7 — mute a lane. This is the whole dynamic arc: subtraction.');
  await shot('07-muted');
  await page.getByTestId('ll-mute-1').click();

  // ── 8. undo
  await page.getByTestId('ll-undo').click();
  await page.waitForTimeout(400);
  const undone = await survey('8 — undo takes back the last thing you did.');
  await shot('08-undone');

  // ── 9. stop, and check the promise it makes
  await page.getByTestId('ll-run').click();
  await page.waitForTimeout(300);
  const stopped = await survey('9 — stop. The lanes keep what they hold.');
  await shot('09-stopped');
  const kept = stopped.lanes.filter((l) => l.has === 'true').length;
  note(`  lanes still holding audio after stop: ${kept}`);
  if (kept === 0) note('  !! CORRECTNESS: stopping erased the lanes');

  // ── 9b. sections: record into A, switch to B, and B is EMPTY — a different set of lanes
  await page.getByTestId('ll-run').click();
  await page.waitForFunction(() => document.querySelector('.mt-liveloop')?.dataset.sounding === 'true', null, { timeout: 20000 });
  await page.getByTestId('ll-sect-B').click();
  await survey('9b — section B armed. It takes over on the next bar; A keeps its lanes.');
  await shot('09b-section-armed', ['.mt-liveloop .mt-ctop']);
  await page.waitForFunction(() => document.querySelector('[data-testid=ll-sect-B]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 15000 });
  await survey('9c — section B is sounding, and its lanes are its own.');
  await shot('09c-section-b');
  await page.getByTestId('ll-sect-A').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=ll-sect-A]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 15000 });
  await survey('9d — back in A, and A still holds what it held.');
  await shot('09d-section-a');
  await page.getByTestId('ll-run').click();

  // ── 10. the narrow case, because a tutorial reader may be on a phone
  await page.setViewportSize({ width: 390, height: 860 });
  await page.waitForTimeout(300);
  await survey('10 — the same case at phone width.');
  await shot('10-phone');

  await page.setViewportSize({ width: 1180, height: 900 });
  await page.waitForTimeout(200);
  await shot('00-whole', ['.mt-liveloop']);
  note(`\npage errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  await writeFile(`${OUT}/tour.txt`, log.join('\n'));
  note(`\nwrote ${OUT}/tour.txt`);
} finally {
  await browser.close();
}
