import { test, expect } from '@playwright/test';

// ── THIS SPEC'S APP HAS ITS OWN ROUTE (2026-08-12). The hash deep link this file used for an hour
// is gone with the scroller: every thing in the room is a standalone page now. Every `page.goto`
// here therefore names the route. It is not a test affordance — it is the app's address — but it is
// what makes real-pointer assertions possible: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case on another page the press landed on nothing and the ring's overshoot read as 1.
// (was: '#metronome` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// ── THESE TESTS NEED THE DESKTOP LAYOUT, SO THEY STATE ITS WIDTH ────────────────────────
// Playwright's default is 1280, and with five cases (practice-room-apps Q1/02+03, Q2/01) the
// room SWIPES below 1477 — the metronome's foot line needs a 190px case, and below that it
// wrapped and pushed `tap` outside a case that clips its overflow. On the phone layout the
// cases are five snap pages, so a control on page 3 sits at x 3157 in a 1280 viewport:
// measured, and `elementFromPoint` at the drone note's centre returned null. A drag test
// against an off-screen control fails for a reason that has nothing to do with dragging.
// One number, one place — a per-test literal is how a suite ends up half-migrated.
const DESKTOP = { width: 1512, height: 900 };
test.use({ viewport: DESKTOP });

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

// THE NOTE CONTROL IS THE FIGURE NOW (user, 2026-08-07: "use the big one in center to change
// pitch too like left to right sliding"), and its step is 14px per semitone rather than the
// 8px the small foot handle used — a 72px target invites a bigger sweep, and at 8px a casual
// drag across the letter crossed nine semitones. The `refnote` testid moved with the role.
test('the reference note scrubs on horizontal drag', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  const note = page.getByTestId('refnote');
  await expect(note).toHaveText('A3');

  const box = (await note.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // drag RIGHT 56px = +4 semitones (14px per step): A3 → C♯4 — one axis for
  // every value now (round16), right = higher like a keyboard
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 56, cy, { steps: 8 });
  await page.mouse.up();
  await expect(note).toHaveText('C♯4');

  // the drag must NOT also fire the click-step (drag suppresses click)
  await page.waitForTimeout(100);
  await expect(note).toHaveText('C♯4');
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
  await page.goto('/practice-room/console/?e2e');
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
  await page.goto('/practice-room/console/?e2e');
  const input = page.getByTestId('bpm');
  await expect(input).toHaveValue('96');

  // This is the whole point of the pick: the same gesture on the digits used to
  // scrub, which is what made "you can also type here" confusing. It must be inert.
  await dragBy(page, input, 80);
  await expect(input).toHaveValue('96');
});

test('the A4 label and the Hz label both scrub the calibration', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
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

// THE DRONE'S CALIBRATION SCRUBS TOO, AND IT MOVES THE ROOM (chooser
// metrotuner-drone-box, the user's Q4 refinement: both cases carry a4, synced). Two
// wrappers are wired now, so the regression this guards is wiring only the first — which
// would leave the drone's labels looking like handles and doing nothing.
test('the drone case scrubs the same calibration', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  const tunerField = page.getByTestId('a4');
  const droneField = page.getByTestId('a4-drone');
  const droneLabels = page.locator('#mt-a4-scrub-drone .mt-hd');
  await expect(droneLabels).toHaveCount(2);

  await dragBy(page, droneLabels.nth(0), 40);   // drag the drone's "a4" → +10
  await expect(droneField).toHaveValue('450');
  await expect(tunerField, 'the tuner must follow — one value').toHaveValue('450');
  expect(await page.evaluate(() => (window as any).__mt.a4)).toBe(450);

  await dragBy(page, droneLabels.nth(1), -40);  // and its "hz" → −10
  await expect(droneField).toHaveValue('440');
  await expect(tunerField).toHaveValue('440');
});

test('the handles are keyboard operable and clamp at their range', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
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
  await page.goto('/practice-room/console/?e2e');
  // The measured cost of pick 03: the bare unit is 27x28px, over WCAG 2.5.8's 24px
  // floor but under the 44px this page holds everywhere else. The padding is the fix,
  // and an invisible target is exactly the kind that regresses silently — so it is
  // asserted rather than eyeballed. `A4`/`Hz` are 2ch and are the narrow case.
  const handles = page.locator('.mt-hd');
  const n = await handles.count();
  // FIVE now: bpm, the tuner's a4 + hz, and the drone case's a4 + hz. The count is
  // asserted rather than left open because a handle that loses its padding is invisible
  // until someone tries to drag it on a phone — and adding an unwired one should fail here
  // too, not just look right.
  expect(n).toBe(5);
  for (let i = 0; i < n; i++) {
    const h = handles.nth(i);
    const box = (await h.boundingBox())!;
    const text = (await h.textContent())!.trim();
    expect(box.width, `${text} handle width`).toBeGreaterThanOrEqual(44);
    expect(box.height, `${text} handle height`).toBeGreaterThanOrEqual(44);
  }
});
