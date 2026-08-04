import { test, expect } from '@playwright/test';

// The scrub steppers (steppers chooser, both Q picks 02): the value IS the control.
// Drag gestures asserted with real pointer sequences — the mobile caveat both picks
// carried is answered by drag-as-primary + touch-action:none, and these tests drive
// the same pointer path a finger takes.

test('the reference note scrubs on vertical drag', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const note = page.getByTestId('refnote');
  await expect(note).toHaveText('A4');

  const box = (await note.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // drag UP 32px = +4 semitones (8px per step): A4 → C♯5
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 32, { steps: 8 });
  await page.mouse.up();
  await expect(note).toHaveText('C♯5');

  // the drag must NOT also fire the click-step (drag suppresses click)
  await page.waitForTimeout(100);
  await expect(note).toHaveText('C♯5');
});

test('the bpm scrubs on horizontal drag and still types', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const wrap = page.locator('#mt-bpm-scrub');
  const input = page.getByTestId('bpm');
  await expect(input).toHaveValue('96');

  const box = (await wrap.boundingBox())!;
  const cx = box.x + 20, cy = box.y + box.height / 2;
  // drag RIGHT 80px = +20 bpm (4px per bpm)
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy, { steps: 10 });
  await page.mouse.up();
  await expect(input).toHaveValue('116');

  // typing still works: clean click focuses, fill, blur applies
  await input.fill('144');
  await input.blur();
  await expect(input).toHaveValue('144');
});
