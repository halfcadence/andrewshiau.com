// /pitchgraph/ AT REST AND MID-PHRASE, in both colourways and at phone width.
//
// THE SECOND STATE IS THE POINT, and it is why this file exists rather than the generic
// screenshot tool. The alignment pass shipped a page whose idle render was correct in every
// configuration and which had two real defects the moment a note was played:
//   · the reading wrapped to two lines at 390/360 once it had a frequency in it, doubling the
//     28px row and pushing the transport down into the record row;
//   · the switch's 9.5px optical nudge overhangs its own row by 3.5px, and the panels' figures
//     were drawn at the TOP of theirs, so the two marks shared pixels once the record filled.
// Both were found by looking at THIS shot. An idle instrument is a picture of furniture; the
// state worth checking is the one a player is in.
//
// The mic is fake and the input is the e2e suite's own four-note fixture, so the panels carry
// known offsets (+20 / −18 / +12 / −6) and a wrong number is legible in the picture.
//
//   npm run build && npx astro preview --host 127.0.0.1 --port 4388
//   node tools/shot-pitchgraph.mjs          # → /tmp/pg-{rest,play}-{light,dark,phone}.png
import { chromium } from '@playwright/test';

const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:4388';
const PREFIX = process.env.SHOT_PREFIX || '/tmp/pg-';
const FIXTURE = new URL('../tests/e2e/fixtures/phrase-4.wav', import.meta.url).pathname;

const browser = await chromium.launch({
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    `--use-file-for-fake-audio-capture=${FIXTURE}`,
  ],
});

// A REAL SCREEN HEIGHT, not the 2400px the site's other shot tool uses. This page is a
// `round(down, 100dvh, --lead)` screen whose middle rows are `1fr`, so a tall viewport stretches
// its placed air and photographs a composition nobody will ever see.
const CONFIGS = {
  light: { viewport: { width: 1440, height: 900 }, colorScheme: 'light' },
  dark: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  phone: { viewport: { width: 390, height: 844 }, colorScheme: 'light' },
  // 429 is the bisected width where the reading stops fitting on one line — the boundary the
  // narrow-screen rule is set just above, so it is worth a picture of its own.
  edge: { viewport: { width: 429, height: 844 }, colorScheme: 'light' },
};

for (const [name, opts] of Object.entries(CONFIGS)) {
  const ctx = await browser.newContext({ ...opts, permissions: ['microphone'] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pitchgraph/`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PREFIX}rest-${name}.png` });

  await page.getByTestId('listen-toggle').click();
  // Wait for the RECORD to fill, not a flat sleep: three panels is what makes the row read as a
  // row, and the phrase is only ~2s long, so a timeout that is too short photographs an empty
  // record and the shot silently stops testing the thing it exists for.
  try {
    await page.waitForSelector('[data-testid="panel"]:nth-child(3)',
      { state: 'attached', timeout: 20000 });
  } catch {
    console.log(`  ! ${name}: fewer than three panels printed — is the fake mic wired?`);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${PREFIX}play-${name}.png` });
  console.log(`${PREFIX}rest-${name}.png · ${PREFIX}play-${name}.png`);
  await ctx.close();
}

await browser.close();
