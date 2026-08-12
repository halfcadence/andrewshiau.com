// Capture the og card at exactly 1200×630, and WAIT FOR THE FONT before shooting.
//
// Called by scripts/og-shoot.py, which serves dist/ on 127.0.0.1 and owns the assertions.
// This file owns one thing: producing a PNG whose pixels are the finished layout.
//
// Why not `chrome --headless --screenshot`: it shipped a card with the whole foot row blank
// while passing every source assertion. --virtual-time-budget fast-forwards timers and fires
// the capture before the webfont-driven final layout composites, and the last box on the page
// is the one that loses. See the long note in og-shoot.py.
//
// Two waits, and both are load-bearing:
//   networkidle  — the four woff2 requests have finished
//   document.fonts.ready — the faces are parsed AND the text has been re-laid-out with them
// A screenshot between those two states is a screenshot of a fallback face at the wrong metrics.
import { chromium } from '@playwright/test';

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: og-capture.mjs <url> <out.png>');
  process.exit(2);
}

const browser = await chromium.launch({args: ['--no-sandbox', '--disable-gpu']});
try {
  const page = await browser.newPage({
    viewport: {width: 1200, height: 630},
    deviceScaleFactor: 1,          // og:image:width says 1200 — do not ship @2x
  });
  await page.goto(url, {waitUntil: 'networkidle'});
  await page.evaluate(() => document.fonts.ready);
  // The card is exactly 1200×630, so the viewport IS the crop.
  await page.screenshot({path: out});

  // ── THE INK CHECK, in the same engine that just painted it. The source assertions in
  // og-shoot.py read the FILE; only this can tell whether the pixels arrived. Sampling three
  // bands catches the failure mode that shipped: mast fine, claim fine, foot blank.
  const bands = await page.evaluate(() => {
    const el = s => document.querySelector(s).getBoundingClientRect();
    const r = {mast: el('.mast'), say: el('.say'), foot: el('.foot')};
    return Object.fromEntries(Object.entries(r).map(([k, v]) =>
      [k, {top: Math.round(v.top), bottom: Math.round(v.bottom)}]));
  });
  console.log(JSON.stringify(bands));
} finally {
  await browser.close();
}
