import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const server = spawn('npm', ['run', 'preview'], { stdio: 'pipe' });
await new Promise((res) => {
  server.stdout.on('data', (d) => { if (String(d).includes('4321')) res(); });
  setTimeout(res, 8000);
});

const browser = await chromium.launch();
for (const [name, opts] of Object.entries({
  light: { viewport: { width: 1440, height: 2400 }, colorScheme: 'light' },
  dark: { viewport: { width: 1440, height: 2400 }, colorScheme: 'dark' },
  phone: { viewport: { width: 390, height: 2400 }, colorScheme: 'light' },
})) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4321/metrotuner/');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/mt-${name}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
server.kill();
process.exit(0);
