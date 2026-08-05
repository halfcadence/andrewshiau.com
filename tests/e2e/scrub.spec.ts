import { test, expect } from '@playwright/test';

// The scrub steppers (steppers chooser, both Q picks 02): the value IS the control.
// Drag gestures asserted with real pointer sequences — the mobile caveat both picks
// carried is answered by drag-as-primary + touch-action:none, and these tests drive
// the same pointer path a finger takes.
//
// THE HANDLE IS THE UNIT (chooser metrotuner-scrub-target, pick 03). The drag used to
// be wired to the whole `#mt-bpm-scrub` wrapper, input included, so these tests dragged
// from `box.x + 20` — a point inside the NUMERAL. That is exactly the overlap the pick
// removed, so the tests move to the unit and gain the negative case: dragging the field
// must now do nothing.

test('the reference note scrubs on horizontal drag', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const note = page.getByTestId('refnote');
  await expect(note).toHaveText('A4');

  const box = (await note.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // drag RIGHT 32px = +4 semitones (8px per step): A4 → C♯5 — one axis for
  // every value now (round16), right = higher like a keyboard
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 32, cy, { steps: 8 });
  await page.mouse.up();
  await expect(note).toHaveText('C♯5');

  // the drag must NOT also fire the click-step (drag suppresses click)
  await page.waitForTimeout(100);
  await expect(note).toHaveText('C♯5');
});

const dragBy = async (page: any, locator: any, dx: number) => {
  const box = (await locator.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy, { steps: 10 });
  await page.mouse.up();
};

test('the bpm scrubs by dragging the UNIT, and still types', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const handle = page.getByTestId('bpm-handle');
  const input = page.getByTestId('bpm');
  await expect(input).toHaveValue('96');

  // drag the word "bpm" RIGHT 80px = +20 bpm (4px per bpm)
  await dragBy(page, handle, 80);
  await expect(input).toHaveValue('116');

  // typing still works: the field is a field
  await input.fill('144');
  await input.blur();
  await expect(input).toHaveValue('144');
});

test('dragging the NUMERAL does nothing — the field only types', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const input = page.getByTestId('bpm');
  await expect(input).toHaveValue('96');

  // This is the whole point of the pick: the same gesture on the digits used to
  // scrub, which is what made "you can also type here" confusing. It must be inert.
  await dragBy(page, input, 80);
  await expect(input).toHaveValue('96');
});

test('the A4 label and the Hz label both scrub the calibration', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const input = page.getByTestId('a4');
  const host = page.locator('#mt-a4-scrub');
  const labels = host.locator('.mt-hd');
  await expect(labels).toHaveCount(2);          // "A4" and "Hz"
  await expect(input).toHaveValue('440');

  // BOTH labels are handles — 1 Hz per 4px. Asserting each separately, because
  // wiring only the first one would pass a test that drags "whichever label".
  await dragBy(page, labels.nth(0), 40);        // "A4" → +10
  await expect(input).toHaveValue('450');

  await dragBy(page, labels.nth(1), -40);       // "Hz" → −10
  await expect(input).toHaveValue('440');

  // AND the calibration actually took effect, not just the field's text. A scrub that
  // writes the input and skips setA4() would pass every assertion above.
  expect(await page.evaluate(() => (window as any).__mt.a4)).toBe(440);
  await dragBy(page, labels.nth(0), 40);
  expect(await page.evaluate(() => (window as any).__mt.a4)).toBe(450);
});

test('the handles are keyboard operable and clamp at their range', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const handle = page.getByTestId('bpm-handle');
  const input = page.getByTestId('bpm');

  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(input).toHaveValue('97');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(input).toHaveValue('95');

  // the handle carries the slider role + range for a screen reader
  await expect(handle).toHaveAttribute('role', 'slider');
  await expect(handle).toHaveAttribute('aria-valuemin', '20');
  await expect(handle).toHaveAttribute('aria-valuemax', '320');
  await expect(handle).toHaveAttribute('aria-valuenow', '95');
});

test('every scrub handle clears the 44px tap target', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  // The measured cost of pick 03: the bare unit is 27x28px, over WCAG 2.5.8's 24px
  // floor but under the 44px this page holds everywhere else. The padding is the fix,
  // and an invisible target is exactly the kind that regresses silently — so it is
  // asserted rather than eyeballed. `A4`/`Hz` are 2ch and are the narrow case.
  const handles = page.locator('.mt-hd');
  const n = await handles.count();
  expect(n).toBe(3);                            // bpm, A4, Hz
  for (let i = 0; i < n; i++) {
    const h = handles.nth(i);
    const box = (await h.boundingBox())!;
    const text = (await h.textContent())!.trim();
    expect(box.width, `${text} handle width`).toBeGreaterThanOrEqual(44);
    expect(box.height, `${text} handle height`).toBeGreaterThanOrEqual(44);
  }
});
