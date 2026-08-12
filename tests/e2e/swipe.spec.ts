import { test, expect } from '@playwright/test';

// The phone mode switch (chooser: metrotuner-two-pages, Q3/02): under 900px the
// halves are snap-scroll pages and the ring/disc dots both indicate and navigate.
// Wide viewports show both halves and no dots — asserted as the control.

test.use({ viewport: { width: 390, height: 720 } });

test('phone: the page words navigate; the current page reads ink', async ({ page }) => {
  await page.goto('/practice-room/');

  // PAGE 0 IS THE ROOM NOW (2026-08-12): the plan is the index and the app opens on it, so the
  // dot in ink at load is the room's own box, not the tuner's mark. This test used to open on the
  // tuner because the room had no index — the change is the whole point of the rewrite, and a
  // test that still expected the tuner would be asserting the old front door.
  await expect(page.getByTestId('dot-plan')).toBeVisible();
  await expect(page.getByTestId('dot-plan')).toHaveClass(/cur/);
  await expect(page.getByTestId('dot-tuner')).toBeVisible();
  await expect(page.getByTestId('dot-tuner')).not.toHaveClass(/cur/);

  // The metronome half exists but is off-screen to the right.
  const metroBefore = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  expect(metroBefore!.x).toBeGreaterThanOrEqual(390);

  // Click "metronome" → the pages scroll, the current word moves.
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700); // smooth scroll settles
  const metroAfter = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  expect(Math.abs(metroAfter!.x)).toBeLessThan(30);
  await expect(page.getByTestId('dot-metro')).toHaveClass(/cur/);
  await expect(page.getByTestId('dot-tuner')).not.toHaveClass(/cur/);

  // A real swipe (drag the scroller) navigates back and the marks follow — to the ROOM, since
  // scrollLeft 0 is the index.
  await page.locator('#mt-pages').evaluate((el) => el.scrollTo({ left: 0, behavior: 'auto' }));
  await page.waitForTimeout(300);
  await expect(page.getByTestId('dot-plan')).toHaveClass(/cur/);
  await expect(page.getByTestId('dot-metro')).not.toHaveClass(/cur/);
});

test('phone: the metronome still runs while the tuner page is shown', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700);
  await page.getByTestId('metro-toggle').click();
  // swipe back to the tuner — the scheduler must keep scheduling
  await page.getByTestId('dot-tuner').click();
  await page.waitForTimeout(1500);
  const ticks: unknown[] = await page.evaluate(() => (window as any).__mt.ticks);
  expect(ticks.length).toBeGreaterThanOrEqual(2);
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700);
  await page.getByTestId('metro-toggle').click();
});

// ── THE DESKTOP CONTROL, REWRITTEN FOR THE QUEUE ─────────────────────────────────────────
// WHAT THIS USED TO ASSERT: five cases on screen at 1512, the last three at their fixed
// `--mt-drone-w / --mt-changes-w / --mt-loop-w` widths, the worked pair squeezed to 208px, and
// NO dots (on the desktop every case was on screen, so an indicator pointed at nothing).
// Every one of those is a statement about a layout that no longer exists. What replaced them,
// and what still has to be true:
//   · the room seats what the width buys and SHARES the leftover, so a case's width is
//     `demand + share` — asserted as ">= its own measured demand", never as a fixed number;
//   · the cases are in the QUEUE's order, left to right;
//   · the foot line stays inside its case, which is the assertion the old clip bug needed;
//   · the dots row now shows on the desktop TOO, because the queue continues off-screen and
//     the row is the only thing that says so. That inverts the old "no dots" control exactly.
// AND THEN THE ROOM BECAME AN INDEX (later the same day). Nothing shares a screen now: 1512 shows
// the PLAN, and the console's three cases are one page you open by pressing a box. So this test
// opens it first. What it still asserts is what it always did — the three widths, their order, and
// the foot line staying inside its case — because those are claims about the console page, which
// still exists. What it can no longer assert is "all five on screen", since that was the busy room
// the owner rejected.
test('desktop: the console page seats its three in order, each at least its own demand', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto('/practice-room/?e2e=1');
  await page.waitForTimeout(300);
  // OPEN THE CONSOLE. Its cases are laid out either way — a bounding box exists off-screen too —
  // but `boxes.tuner.x < 100` is a claim about what you are LOOKING at, and on the plan the tuner
  // sits at +1456. Navigating first is what makes the assertion about the console page.
  await page.locator('[data-testid="plan-console"]').click();
  await page.waitForTimeout(900);

  const DEMAND: Record<string, number> = {
    tuner: 170, metronome: 196, drone: 170, changes: 315, loop: 236,
  };
  const boxes: Record<string, { x: number; width: number; y: number; height: number }> = {};
  for (const [key, label] of [
    ['tuner', 'Tuner'], ['metronome', 'Metronome'], ['drone', 'Drone'],
    ['changes', 'Chord dealer'], ['loop', 'Loop'],
  ] as Array<[string, string]>) {
    boxes[key] = (await page.locator(`.mt-half[aria-label="${label}"]`).boundingBox())!;
  }

  // nothing is ever queued now — the mechanism is deleted, not merely idle at this width
  await expect(page.locator('#mt-pages .mt-half[data-queued]')).toHaveCount(0);

  // EACH AT LEAST ITS OWN MEASURED DEMAND. This is the invariant the fixed widths used to
  // state as three magic numbers: a case may be wider than its demand (its page's spare room is
  // split by demand) but never narrower, because below the demand its own ink breaks.
  for (const [key, d] of Object.entries(DEMAND)) {
    expect(Math.round(boxes[key].width), `${key} keeps at least its ${d}px`)
      .toBeGreaterThanOrEqual(d);
  }

  // IN THE ROOM'S ORDER, left to right, each clear of the last.
  // THE ORDER IS THE CONSOLE'S OWN KEYS FIRST — tuner, drone, metronome — then the two
  // standalones. It was tuner/metronome/drone when the room held five peers; the grouping
  // (`practice-room-plan` Q1/02) put the drone beside the tuner because that is the pair you
  // actually use together.
  const seq = ['tuner', 'drone', 'metronome', 'changes', 'loop'];
  // the console's first case is on the room's own 3ch inset datum; the two standalones are the
  // pages after it, off to the right — which the sequence check below states exactly
  expect(boxes.tuner.x).toBeLessThan(100);
  expect(boxes.changes.x, 'the changes is the NEXT page, not a neighbour')
    .toBeGreaterThan(1512 - 100);
  for (let n = 1; n < seq.length; n += 1) {
    const prev = boxes[seq[n - 1]], cur = boxes[seq[n]];
    expect(cur.x, `${seq[n]} sits after ${seq[n - 1]}`).toBeGreaterThan(prev.x + prev.width - 1);
  }

  // THE MEASURED TOKENS SURVIVE — they are what the phone's cases are drawn from, and what
  // room.ts's demands were derived from. 315 is the widest chord symbol at 72px; 236 is
  // sixteen countable ticks.
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#mt-app')!);
    return {
      drone: cs.getPropertyValue('--mt-drone-w').trim(),
      changes: cs.getPropertyValue('--mt-changes-w').trim(),
      loop: cs.getPropertyValue('--mt-loop-w').trim(),
    };
  });
  expect(tokens).toEqual({ drone: '210px', changes: '315px', loop: '236px' });

  // AND THE FOOT LINE STAYS INSIDE ITS CASE. This is the assertion the clip bug needed and did
  // not have: the metronome's foot holds `bpm` and `tap` on one line, and a wrap pushes a real
  // control out of a case that clips its overflow.
  const foot = (await page.locator('.mt-half[aria-label="Metronome"] .mt-cfoot').boundingBox())!;
  expect(foot.y + foot.height, 'the foot line must not spill past the case')
    .toBeLessThanOrEqual(boxes.metronome.y + boxes.metronome.height);
  const tapBox = (await page.getByTestId('tap').boundingBox())!;
  expect(tapBox.y + tapBox.height, 'tap must be inside the viewport').toBeLessThanOrEqual(900);

  // THE DOTS SHOW ON THE DESKTOP NOW — the inversion of the old control. The room continues past
  // this page in both directions, and the row is how you know and how you jump.
  await expect(page.getByTestId('dot-tuner')).toBeVisible();
  await expect(page.getByTestId('dot-plan')).toBeVisible();
  // and the way back to the index is ONE lead of chrome, visible because we are in an app
  await expect(page.getByTestId('plan-word')).toHaveText('← the room');
  // The instrument still carries no SITE chrome: the mark is deleted (2026-08-04). The back mark
  // is the room's own navigation, not the site's.
  await expect(page.getByTestId('home-mark')).toHaveCount(0);
});

// ── THE ROW HOLDS GLYPHS NOW (queue chooser, Q5/02) ──────────────────────────────────────
// WHAT THIS TEST USED TO SAY, and why the answer changed rather than the question: the five
// pages were NAMED, and the words row was what broke first at 390px — measured at 568px of
// words against a 390px viewport, so it wrapped to two lines and the foot took a second lead.
// That was the accepted cost of naming five pages, and a sixth would have made it three lines.
// The queue can grow, so the words went and each page is marked by its own case's drawing at
// 16px. The question is unchanged and still the sharpest one about this row: does it FIT, and
// is every page reachable? A page you cannot reach is a case that does not exist on a phone.
test('phone: six pages, six glyphs, one line', async ({ page }) => {
  await page.goto('/practice-room/');

  const row = page.locator('#mt-dots');
  const fit = await row.evaluate((el) => {
    const dots = [...el.querySelectorAll('.pgdot')];
    const tops = new Set(dots.map((k) => Math.round(k.getBoundingClientRect().top)));
    return { n: dots.length, lines: tops.size,
             overflows: el.scrollWidth > el.clientWidth + 1,
             width: Math.round(el.getBoundingClientRect().width),
             // five DISTINCT drawings: five identical marks would be a working-looking row
             // that says nothing, which is the failure mode a glyph set has and words do not
             drawings: new Set(dots.map((k) => k.querySelector('svg')?.innerHTML)).size,
             // the NAME has to survive the words going, for anyone not looking at the screen
             labels: dots.map((k) => k.getAttribute('aria-label')) };
  });
  // SIX, because the ROOM is a page too. Five marks over six pages is an indicator that lies:
  // standing on the index lit the tuner's mark.
  expect(fit.n).toBe(6);
  expect(fit.drawings, 'six distinct drawings').toBe(6);
  // the room first, then the console's own key order — tuner, drone, metronome — then the two
  // standalones
  expect(fit.labels).toEqual(['the room', 'tuner', 'drone', 'metronome', 'the changes', 'the loop']);
  // ONE LINE AT 390px — the whole reason the words went. Measured: 148px for five, ~180 for six.
  expect(fit.lines, 'six glyphs set on one line at 390px').toBe(1);
  expect(fit.overflows, 'the row must not overflow').toBe(false);
  expect(fit.width).toBeLessThanOrEqual(390);

  // ── AND EVERY GLYPH IS INSIDE THE VIEWPORT, which is the assertion that caught a real bug
  // on the words version and is kept verbatim in spirit: the row was `nowrap`, five words set
  // 414px, the flex centred them, and the row hung from x −12 to 402 with two labels clipped
  // by the SCREEN. `lines` and `overflows` BOTH passed on it — nothing scrolled, and one line
  // was exactly what the assertion wanted. A row can satisfy every box-level check and still
  // have two of its five marks off the glass.
  const inside = await row.evaluate((el) =>
    [...el.querySelectorAll('.pgdot')].map((k) => {
      const b = k.getBoundingClientRect();
      return { t: k.getAttribute('aria-label'), ok: b.left >= 0 && b.right <= window.innerWidth };
    }));
  expect(inside.filter((w) => !w.ok), 'every glyph must be on the screen').toEqual([]);

  // and EVERY glyph navigates to its own page — the room's own included, since the chrome word is
  // hidden at this width and the dot is therefore the only way back to the index.
  for (const [testid, label] of [
    ['dot-drone', 'Drone'],
    ['dot-changes', 'Chord dealer'],
    ['dot-loop', 'Loop'],
    ['dot-tuner', 'Tuner'],
    ['dot-plan', 'The room'],
  ] as Array<[string, string]>) {
    await page.getByTestId(testid).click();
    await page.waitForTimeout(700);
    const box = (await page.locator(`.mt-half[aria-label="${label}"]`).boundingBox())!;
    expect(Math.abs(box.x), `${label} snapped into view`).toBeLessThan(30);
    await expect(page.getByTestId(testid)).toHaveClass(/cur/);
  }

  // AND THE INDEX IS PAGE 0, reached by swiping BACK rather than past the last instrument. It was
  // the room's last page when the plan was a settings screen you visited; it is the front door
  // now, which is what "positions are fixed and you press a box" made it.
  await page.locator('#mt-pages').evaluate((el) => {
    el.scrollTo({ left: el.clientWidth * 3, behavior: 'auto' });
  });
  await page.waitForTimeout(400);
  await page.locator('#mt-pages').evaluate((el) => el.scrollTo({ left: 0, behavior: 'auto' }));
  await page.waitForTimeout(400);
  const orderBox = (await page.locator('.mt-order').boundingBox())!;
  expect(Math.abs(orderBox.x), 'the plan is the first page').toBeLessThan(30);
  // THE PLAN IS A BOX WITH THREE ROOMS IN IT: the console plus the two standalones
  // (`practice-room-box`, 2026-08-12), each a button that opens its page.
  await expect(page.locator('#mt-planroom .mt-pbox')).toHaveCount(3);
});

test('phone: the accent mark clears the plate it sits under', async ({ page }) => {
  // User nit, 2026-08-05: "the accent is too close to the text metronome on mobile —
  // vertically". It was worse than close: measured on the live page at 360/390/430 the
  // plate's line box ran y 0→28 and the mark's ink y 20→28, overlapping by 8px in the same
  // band. Two things moved opposite ways on the phone — the plate drops to straddle the
  // inset frame while the mark reaches 8px above its own row — and only the phone put them
  // in the same place, which is why desktop always looked right (5px clear).
  // Asserted as a positive clearance rather than a pixel count, so the composition can be
  // retuned without editing the test; the companion assertion is that the mark still TOUCHES
  // the digits, because it is the accent over the 1 and must not drift off the thing it marks.
  await page.goto('/practice-room/');
  // THE METRONOME IS PAGE 3 NOW, not page 1: the phone's pages are the room, then the console's
  // three instruments, then the two standalones. `scrollLeft = clientWidth` used to land on it and
  // now lands on the tuner, so this asks for the page by NAME instead of by index — the dot is the
  // page's own navigation and cannot drift when the order changes again.
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700);

  const box = await page.evaluate(() => {
    const plate = [...document.querySelectorAll('.mt-plate')]
      .find((e) => e.textContent?.trim() === 'metronome')!;
    const mark = document.getElementById('mt-acc-mark')!;
    const digits = document.querySelector('#mt-beats-seg .rm-digits')!;
    const p = plate.getBoundingClientRect();
    const m = mark.getBoundingClientRect();
    const d = digits.getBoundingClientRect();
    return { clearance: m.top - p.bottom, markToDigits: d.top - m.bottom };
  });

  expect(box.clearance,
    'the accent mark overlaps or crowds the "metronome" plate').toBeGreaterThanOrEqual(12);
  expect(box.markToDigits,
    'the mark drifted off the digits it annotates').toBeLessThanOrEqual(4);
});
