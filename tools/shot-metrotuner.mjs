import { chromium } from '@playwright/test';
const base = process.env.SHOT_URL || 'http://127.0.0.1:4321/metrotuner/';
const prefix = process.env.SHOT_PREFIX || '/tmp/mt-';
const browser = await chromium.launch();
for (const [name, opts] of Object.entries({
  light: { viewport: { width: 1440, height: 2400 }, colorScheme: 'light' },
  dark: { viewport: { width: 1440, height: 2400 }, colorScheme: 'dark' },
  phone: { viewport: { width: 390, height: 2400 }, colorScheme: 'light' },
})) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${prefix}${name}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
