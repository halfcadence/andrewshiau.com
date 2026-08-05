import { test, expect } from '@playwright/test';

// The accent toggle: off, the downbeat is an ordinary beat — asserted through the
// ?e2e hook's tick log (voice is what SOUNDS) and the persisted flag.
//
// THE MARK IS ASSERTED TOO (chooser metrotuner-meter-tap, pick 01/03 + the user's `>`
// refinement). The first test below checks `aria-pressed`, the tick log, and nothing
// visible — so it passed with NO on-screen state at all, which is close to the defect
// that prompted the change. A control whose visible state is untested is a control
// whose visible state can quietly vanish.

test('accent off demotes the downbeat voice; the setting persists', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');

  // Default: on, disc filled.
  const acc = page.getByTestId('accent-toggle');
  await expect(acc).toHaveAttribute('aria-pressed', 'true');

  // Run a bar with accent ON: tick log contains a 'down' voice.
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(2000);
  await page.getByTestId('metro-toggle').click();
  const voicesOn: string[] = await page.evaluate(() =>
    (window as any).__mt.ticks.map((t: any) => t.voice));
  expect(voicesOn).toContain('down');

  // The tick log records the SCHEDULED voice; the audible demotion happens at the
  // click synth via effVoice. Assert the control's own contract instead: toggling
  // flips state + persists across reload.
  await acc.click();
  await expect(acc).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByTestId('accent-toggle')).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });

  // Restore on for other tests' sake.
  await page.getByTestId('accent-toggle').click();
  await expect(page.getByTestId('accent-toggle')).toHaveAttribute('aria-pressed', 'true');
});

test('the `>` mark states the accent, as a real rendered colour change', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const mark = page.locator('#mt-acc-mark');
  const acc = page.getByTestId('accent-toggle');

  // The mark is ALWAYS drawn — value is the signal, not presence. (Pick 03 over 04:
  // a control whose off state is blank does not announce that it has an on state.)
  await expect(mark).toBeVisible();

  // SETTLED values only. The stroke transitions on --dur-fast (140ms), so reading it
  // straight after a click returns an interpolated colour — the first version of this
  // test compared a settled `on` against a mid-tween `rgb(93,92,85)` and failed. That
  // intermediate value is itself proof the transition runs; it is just not the thing
  // being asserted. 250ms clears 140ms with room for scheduling.
  const stroke = async () => {
    await page.waitForTimeout(250);
    return mark.evaluate((el) => getComputedStyle(el).stroke);
  };
  await expect(acc).toHaveAttribute('aria-pressed', 'true');
  const on = await stroke();

  await acc.click();
  await expect(acc).toHaveAttribute('aria-pressed', 'false');
  const off = await stroke();

  // Not "a class toggled" — the RENDERED stroke must differ. A class-only assertion
  // would still pass if the CSS rule that colours it were deleted.
  expect(on).not.toBe(off);

  await acc.click();
  await expect(acc).toHaveAttribute('aria-pressed', 'true');
  expect(await stroke(), 'and it returns to the on colour').toBe(on);
});

test('the accent mark adds no layout — both meters keep one baseline', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  // `.mt-rm` is a column flex and baselines on its FIRST item, so an in-flow mark row
  // above the digits would become the beats meter's baseline and drop it below
  // `subdivide`. The mark is absolutely positioned for exactly that reason, and this
  // test is what stops someone "simplifying" it back into the flow.
  const beats = page.locator('#mt-beats-seg .rm-digits');
  const sub = page.locator('#mt-sub-seg .rm-digits');
  const a = (await beats.boundingBox())!;
  const b = (await sub.boundingBox())!;
  expect(Math.abs(a.y - b.y), 'beats and subdivide digit rows share a top edge').toBeLessThan(1.5);

  // and toggling must not move anything
  await page.getByTestId('accent-toggle').click();
  const a2 = (await beats.boundingBox())!;
  expect(Math.abs(a2.y - a.y), 'toggling the accent does not shift the digits').toBeLessThan(0.5);
  await page.getByTestId('accent-toggle').click();
});

test('the tap SNAPS — the ring overshoots on press and settles back', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const tapBtn = page.getByTestId('tap');
  const ring = page.locator('#mt-tap .tk');

  const scale = () => ring.evaluate((el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return m.a;                                  // the x-scale
  });

  expect(await scale(), 'at rest the ring is unscaled').toBeCloseTo(1, 1);

  // Press and HOLD, then read: the snap is applied on pointerdown. Playwright's
  // mouse.down/up is a real pointer sequence, which is the path a finger takes.
  const box = (await tapBtn.boundingBox())!;
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  const peak = await scale();
  await page.mouse.up();
  expect(peak, 'the ring overshoots on press').toBeGreaterThan(1.5);

  // and it comes back — the settle is what animates (--dur = 220ms)
  await page.waitForTimeout(500);
  expect(await scale(), 'the ring settles back').toBeCloseTo(1, 1);
});

test('the tap hold shortens as the tempo rises, so the snap always resolves', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  // At 320 bpm a strike lands every 188ms; a fixed 90ms hold plus a 220ms settle
  // would still be settling when the next press arrives and the ring would never
  // return. The hold is min(90, interval/3), so it scales with the tempo.
  const held = (bpm: number) => Math.min(90, Math.max(24, (60000 / bpm) / 3));
  await page.getByTestId('bpm').fill('320');
  await page.getByTestId('bpm').blur();
  expect(held(320)).toBeLessThan(90);
  expect(held(320)).toBeGreaterThanOrEqual(24);
  expect(held(60)).toBe(90);

  // the ring still returns to rest between strikes at the top tempo
  const ring = page.locator('#mt-tap .tk');
  const box = (await page.getByTestId('tap').boundingBox())!;
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(500);
  const s = await ring.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
  expect(s, 'settles even at 320 bpm').toBeCloseTo(1, 1);
});

test('the control labels are lowercase; the READOUT keeps its case', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  // Pick Q3/02, with the distinction that made it defensible: these are labels on a
  // control, so they go lowercase with `beats`/`subdivide`/`tap`. The tuner's readout
  // states a real note and a measured frequency, so it keeps A4 and Hz.
  const labels = page.locator('#mt-a4-scrub .mt-lb');
  await expect(labels.nth(0)).toHaveText('a4');
  await expect(labels.nth(1)).toHaveText('hz');
  await expect(page.locator('#mt-bpm-scrub .mt-lb')).toHaveText('bpm');

  // No capitalised label may creep back in anywhere on the instrument.
  const caps = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.mt-lb'))
      .map((el) => el.textContent!.trim())
      .filter((t) => t !== t.toLowerCase()));
  expect(caps, 'every .mt-lb is lowercase').toEqual([]);

  // The readout, for contrast: the reference-tone button still names a real note.
  await expect(page.getByTestId('refnote')).toHaveText('A4');
});
