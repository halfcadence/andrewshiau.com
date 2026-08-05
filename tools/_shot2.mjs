import { chromium } from '@playwright/test';
const base = 'http://127.0.0.1:4321/metrotuner/';
const b = await chromium.launch();
for (const [n,o] of Object.entries({
  'd1440': {viewport:{width:1440,height:900}},
  'd1440grid': {viewport:{width:1440,height:900}, grid:true},
  'd1024': {viewport:{width:1024,height:700}},
  'p390': {viewport:{width:390,height:844}},
})) {
  const c = await b.newContext({viewport:o.viewport, colorScheme:'light'});
  const p = await c.newPage();
  await p.goto(base); await p.waitForTimeout(500);
  if (o.grid) { await p.evaluate(()=>{document.documentElement.classList.add('showgrid');document.body.classList.add('showgrid')}); await p.waitForTimeout(300); }
  await p.screenshot({path:`/tmp/mt2-${n}.png`});
  await c.close();
}
await b.close();
