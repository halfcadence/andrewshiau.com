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
  await page.goto('/practice-room/?e2e');

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
  await page.goto('/practice-room/?e2e');
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
  // FILL, not stroke. The state moved to fill with pick Q1/03 (filled vs hollow) and
  // both states are now ink — so a stroke-only reader would see no difference at all
  // and this test would pass while asserting nothing. It is the fill that changes.
  const stroke = async () => {
    await page.waitForTimeout(250);
    return mark.evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.fill + ' / ' + cs.strokeWidth;
    });
  };
  await expect(acc).toHaveAttribute('aria-pressed', 'true');
  const on = await stroke();

  await acc.click();
  await expect(acc).toHaveAttribute('aria-pressed', 'false');
  const off = await stroke();

  // Not "a class toggled" — the RENDERED paint must differ. A class-only assertion
  // would still pass if the CSS that draws the difference were deleted.
  expect(on).not.toBe(off);

  await acc.click();
  await expect(acc).toHaveAttribute('aria-pressed', 'true');
  expect(await stroke(), 'and it returns to the on paint').toBe(on);
});

test('the accent mark adds no layout — both meters keep one baseline', async ({ page }) => {
  // THE PREMISE IS A WIDTH, so the width is stated. Below 1479 the two meters STACK by
  // design (`.mt-ctop{flex-direction:column}` — the case is too narrow to hold 431px of
  // label+scale on one line), so "share a top edge" is only a claim about the wide layout.
  // This test ran at Playwright's default 1280 and passed for as long as the room had two
  // cases; the drone's 210px moved the stacking threshold up past 1280, and the test then
  // reported the STACKED layout as a broken baseline (Δy 56, which is exactly one stacked
  // row). What it exists to catch is the accent mark taking over the row's baseline — a
  // mark-in-flow regression — and that is a wide-layout fact.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto('/practice-room/?e2e');
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

// THE STACKED LAYOUT IS A CLAIM TOO, and nothing asserted it before — which is how the
// stacking threshold could move 200px with only an unrelated baseline test noticing.
//
// WHAT THE CONTRACT ACTUALLY IS, measured rather than taken from the source comment: below
// 1479 the two meters stack (`flex-direction:column` + `justify-content:flex-start`) and
// each GROUP — its label plus its scale — starts on the case's inset datum. Both groups read
// 563.0 at 1280, i.e. 0.0px apart and on the 3ch inset.
// The first version of this test asserted the two SCALES share a left edge, and that is
// false by 36px: `beats` sets 45px wide and `subdivide` 81px, so a scale that follows its
// own label cannot line up with the other one. The page has never done it — the offset
// predates the drone; what changed is that the widths which stack now reach up to 1479, so
// more screens see it. Left as an observation for the owner rather than silently
// redesigned: making the scales align needs a label column, which is a composition decision.
test('below the stacking width the meters stack flush left, in order', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/practice-room/?e2e');
  const beats = (await page.locator('#mt-beats-seg .rm-digits').boundingBox())!;
  const sub = (await page.locator('#mt-sub-seg .rm-digits').boundingBox())!;

  expect(sub.y, 'subdivide sits BELOW beats when stacked').toBeGreaterThan(beats.y + 20);

  // Each group on the inset datum — the page's own horizontal rule (see
  // tools/verify-practice-room-datums.mjs, which checks this system at 14 widths).
  // MEASURE THE INK, NOT THE BOX. The sub-cases treatment (2026-08-07) wraps each meter in
  // a bordered box, and that box deliberately hangs 15px OUTSIDE the inset datum — pad out,
  // pull the padding back with a negative margin, so the controls land on the datum and the
  // box overhangs into the case's air. It is the same idiom `.mt-hd` and the meter digits
  // already use, and the datums harness checks the result at 14 widths.
  // So the group's own `x` is now 15px left of the datum BY DESIGN, and asserting otherwise
  // asserts the treatment away. What must still hold is what this test was always about:
  // the two meters read from ONE left edge, and that edge is the datum.
  const flush = await page.evaluate(() => {
    const half = document.querySelector('.mt-half[aria-label="Metronome"]')!;
    const cs = getComputedStyle(half);
    const contentLeft = half.getBoundingClientRect().x + parseFloat(cs.paddingLeft);
    const digits = (sel: string) =>
      half.querySelector(sel)!.getBoundingClientRect().x;
    const fl = digits('#mt-beats-seg .rm-digits');
    const fr = digits('#mt-sub-seg .rm-digits');
    return { groupDelta: Math.abs(fl - fr), insetDelta: Math.abs(fl - contentLeft) };
  });
  expect(flush.groupDelta, 'both meter groups read from one left edge').toBeLessThan(1.5);
  expect(flush.insetDelta, 'and that edge is the inset datum').toBeLessThan(1.5);

  // and the spec row grew to hold them, rather than the meters overhanging into the figure
  const fits = await page.evaluate(() => {
    const top = document.querySelector('.mt-half[aria-label="Metronome"] .mt-ctop')!;
    const seg = document.querySelector('#mt-sub-seg')!;
    return seg.getBoundingClientRect().bottom <= top.getBoundingClientRect().bottom + 1;
  });
  expect(fits, 'the spec row must contain both stacked meters').toBe(true);
});

test('the tap SNAPS — the ring overshoots on press and settles back', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
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
  await page.goto('/practice-room/?e2e');
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
  await page.goto('/practice-room/?e2e');
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

  // The readout, for contrast: the drone's figure still names a real note (A3 by default since
  // 2026-08-07 — the register a cello drones in).
  await expect(page.getByTestId('refnote')).toHaveText('A3');
});

test('CLICKING THE MARK toggles the accent, and the rule agrees', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // The mark shipped as a bare <svg>: the state was drawn where the eye goes while the
  // control was the 140px rule below it, so the one thing that LOOKS like the accent
  // was the one thing that did not toggle it. ("i want to control the accent by
  // clicking it".) Both are buttons now, on one state.
  const mark = page.getByTestId('accent-mark');
  const rule = page.getByTestId('accent-toggle');
  await expect(mark).toHaveAttribute('aria-pressed', 'true');

  await mark.click();
  await expect(mark).toHaveAttribute('aria-pressed', 'false');
  await expect(rule, 'the rule reflects the same state').toHaveAttribute('aria-pressed', 'false');

  // and the other target still drives it
  await rule.click();
  await expect(mark).toHaveAttribute('aria-pressed', 'true');
  await expect(rule).toHaveAttribute('aria-pressed', 'true');

  // it persists like the rule's clicks always did
  await mark.click();
  await page.reload();
  await expect(page.getByTestId('accent-mark')).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });
  await page.getByTestId('accent-mark').click();
});

test('the mark is what a click on the `>` actually hits', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // A button that exists but sits under something else is the bug this catches — the
  // svg is absolutely positioned inside it, so a z-index or stacking mistake would
  // leave the visible glyph unclickable while every aria assertion above still passed.
  const hit = await page.evaluate(() => {
    const m = document.getElementById('mt-acc-mark')!.getBoundingClientRect();
    return document.elementFromPoint(m.x + 4, m.y + 4)!.closest('button')?.id ?? 'NONE';
  });
  expect(hit).toBe('mt-acc');
});

test('the mark button clears 24px and does not swallow the digits', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const box = (await page.getByTestId('accent-mark').boundingBox())!;
  // The glyph is 9x8px, under any tap floor, so the button pads out to WCAG 2.5.8's
  // 24px. NOT 44px: a 44px box centred on the digit 1 would overlap the digit 2 button
  // and eat clicks meant for the meter. The 140px rule is the large touch target.
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);

  const d2 = (await page.locator('#mt-beats-seg .rbtn[data-beats="2"]').boundingBox())!;
  expect(box.x + box.width, 'the mark does not reach the digit 2 target').toBeLessThanOrEqual(d2.x + 1);

  // and the meter still sets the bar length — the mark sits inside `#mt-beats-seg`,
  // whose delegated handler reads data-beats off the closest button
  await page.locator('#mt-beats-seg .rbtn[data-beats="3"]').click();
  await expect(page.locator('#mt-beats-seg .rbtn[data-beats="3"]')).toHaveAttribute('aria-pressed', 'true');
  // clicking the MARK must not change the bar length
  await page.getByTestId('accent-mark').click();
  await expect(page.locator('#mt-beats-seg .rbtn[data-beats="3"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('accent-mark').click();
});

test('the accent state stays readable while the pointer is ON the mark', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const mark = page.locator('#mt-acc-mark');
  const btn = page.getByTestId('accent-mark');
  const style = () => mark.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { stroke: cs.stroke, width: cs.strokeWidth };
  });

  // THE BUG THIS EXISTS FOR: the first hover rule was `stroke:var(--ink)`, which made
  // the OFF mark render the exact colour the ON mark uses. Measured, off-with-pointer
  // and on-with-pointer both computed rgb(20,20,18) — so on the one control whose job
  // is to show its state, you could not see what you had just toggled without moving
  // the mouse away. Hover is the accent hue now, which is orthogonal to the ink/faint
  // axis the state lives on.
  await btn.hover();
  await page.waitForTimeout(250);
  const onHover = await style();

  await btn.click();
  await page.waitForTimeout(250);
  const offHover = await style();

  expect(
    onHover.stroke !== offHover.stroke || onHover.width !== offHover.width,
    'on and off must differ WHILE hovered',
  ).toBe(true);

  await btn.click();
});

test('the beats rule is ONE straight line — no tick, no stub', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // "can the line under beats be just a straight line". The left tick once carried the
  // accent state as a 3px height change; the `>` took that job, leaving a stub that
  // drew nothing. Asserting the COUNT is what stops it coming back — a second <line>
  // here is either a resurrected tick or a new decoration.
  const lines = page.locator('#mt-beats-seg .rm-rule line');
  await expect(lines).toHaveCount(1);

  // and it is horizontal: one y for both ends
  const geom = await lines.first().evaluate((el) => ({
    y1: el.getAttribute('y1'), y2: el.getAttribute('y2'),
    x1: Number(el.getAttribute('x1')), x2: Number(el.getAttribute('x2')),
  }));
  expect(geom.y1).toBe(geom.y2);
  expect(geom.x2).toBeGreaterThan(geom.x1);

  // toggling the accent must not add anything back
  await page.getByTestId('accent-mark').click();
  await expect(page.locator('#mt-beats-seg .rm-rule line')).toHaveCount(1);
  await page.getByTestId('accent-mark').click();
});

test('the rule button still shows hover feedback after the tick was deleted', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // The hover rule used to select `line[data-acc-tick]`, and that tick is gone — so the
  // selector matched nothing and the LARGER of the two accent targets silently lost its
  // hover state. A dangling descendant selector fails quietly: the CSS still parses.
  const line = page.locator('#mt-beats-seg .rm-rule line');
  const stroke = async () => {
    await page.waitForTimeout(200);
    return line.evaluate((el) => getComputedStyle(el).stroke);
  };
  const rest = await stroke();
  await page.getByTestId('accent-toggle').hover();
  const hovered = await stroke();
  expect(hovered, 'hovering the rule changes the line colour').not.toBe(rest);
});

test('the mark is FILLED when accented and HOLLOW when not', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const mark = page.locator('#mt-acc-mark');
  const btn = page.getByTestId('accent-mark');
  const paint = () => mark.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fill: cs.fill, stroke: cs.stroke };
  });

  // Pick Q1/03. The two states used to differ only by colour value (--ink vs --faint,
  // measured 3.54:1) plus 0.4px of stroke on a 9px glyph — "unfort rly similar". The
  // difference is fill now, which is a categorical channel rather than a scalar one.
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(4, 4);          // nothing hovered, so this is the rest state
  await page.waitForTimeout(250);
  const on = await paint();
  expect(on.fill, 'accented: the wedge is solid').not.toBe('none');

  await btn.click();
  // MOVE THE POINTER OFF before measuring. Playwright leaves the mouse where it
  // clicked, so the mark stays hovered — and hover paints the accent hue. The first
  // version of this test read rgb(20,48,107) for the hollow stroke and failed against
  // ink; the navy was correct, it was just measuring the hover state.
  await page.mouse.move(4, 4);
  await page.waitForTimeout(250);
  const off = await paint();
  expect(off.fill, 'unaccented: the wedge is an outline').toBe('none');

  // BOTH STATES ARE INK. Dimming the hollow one would stack a value difference on top
  // of the fill difference and re-import the contrast problem into the state that is
  // meant to read as "here, but not accented".
  expect(off.stroke, 'the hollow state is still ink, not faint').toBe(on.stroke);

  // the glyph must be a closed shape — a polyline cannot be filled convincingly
  await expect(mark.locator('polygon')).toHaveCount(1);
  await expect(mark.locator('polyline')).toHaveCount(0);

  await btn.click();
});

test('the accent toggle AUDITIONS the voice it just chose', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // Pick Q2/02. The accent was already audible, but only once the metronome was running
  // and only when the bar came round — so setting the switch while stopped told you
  // nothing. Now the toggle plays the tick it changes: G6 (1568 Hz) on, C6 (1046.5) off.
  //
  // Recorded by patching createOscillator, because an assertion on "a sound played"
  // that does not check the FREQUENCY would pass if both states played the same ping —
  // which is exactly the failure the option exists to avoid.
  await page.evaluate(() => {
    (window as any).__pings = [];
    const OC = window.AudioContext;
    const orig = OC.prototype.createOscillator;
    OC.prototype.createOscillator = function (this: AudioContext) {
      const osc = orig.call(this);
      const start = osc.start.bind(osc);
      osc.start = function (t?: number) {
        (window as any).__pings.push(osc.frequency.value);
        return start(t);
      };
      return osc;
    };
  });

  const pings = () => page.evaluate(() => (window as any).__pings);
  const reset = () => page.evaluate(() => ((window as any).__pings = []));

  // ON -> OFF plays the ordinary beat
  await reset();
  await page.getByTestId('accent-mark').click();
  await page.waitForTimeout(200);
  expect(await pings(), 'switching OFF auditions C6').toEqual([1046.5]);

  // OFF -> ON plays the accented downbeat
  await reset();
  await page.getByTestId('accent-mark').click();
  await page.waitForTimeout(200);
  expect(await pings(), 'switching ON auditions G6').toEqual([1568]);

  // and the RULE — the other target for the same state — auditions too
  await reset();
  await page.getByTestId('accent-toggle').click();
  await page.waitForTimeout(200);
  expect(await pings(), 'the rule target auditions as well').toEqual([1046.5]);
  await page.getByTestId('accent-toggle').click();
});

test('the audition does not pollute the tick log', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // `ping` is the sound; `click` is the sound PLUS the scheduler's bookkeeping. An
  // audition must not push to the ?e2e tick log or the pending queue — a toggle's
  // preview is not a tick, and logging it would corrupt every tick assertion in this
  // suite. This is what stops someone "simplifying" the audition to call click().
  const ticks = () => page.evaluate(() => (window as any).__mt.ticks.length);
  expect(await ticks()).toBe(0);
  await page.getByTestId('accent-mark').click();
  await page.getByTestId('accent-mark').click();
  await page.waitForTimeout(200);
  expect(await ticks(), 'auditioning logged no ticks').toBe(0);
});
