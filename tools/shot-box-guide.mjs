// Shoot the practice room with ⌥G raised, at a list of widths, for looking at.
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/shot-box-guide.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';
const OUT = process.env.OUT || '/tmp/boxguide';
const WIDTHS = (process.env.WIDTHS || '1512,1440,1024,390').split(',').map(Number);
const GRID = process.env.GRID !== '0';
const SCHEME = process.env.SCHEME || 'light';

const browser = await chromium.launch();
for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 }, colorScheme: SCHEME, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('#mt-dial', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => {
    const g = document.querySelector('.mt-half[aria-label="Tuner"] .mt-gauge');
    return g && g.getBoundingClientRect().width > 10;
  }, null, { timeout: 15000 });
  await page.waitForTimeout(200);
  if (GRID) {
    await page.evaluate(() => {
      document.documentElement.classList.add('showgrid');
      document.body.classList.add('showgrid');
    });
    await page.waitForTimeout(200);
  }
  const f = `${OUT}-${SCHEME}-${width}${GRID ? '-g' : ''}.png`;
  await page.screenshot({ path: f });
  console.log(f);
  await ctx.close();
}
await browser.close();
