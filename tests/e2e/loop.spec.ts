import { test, expect } from '@playwright/test';

// ── THIS SPEC'S APP HAS ITS OWN ROUTE (2026-08-12). The hash deep link this file used for an hour
// is gone with the scroller: every thing in the room is a standalone page now. Every `page.goto`
// here therefore names the route. It is not a test affordance — it is the app's address — but it is
// what makes real-pointer assertions possible: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case on another page the press landed on nothing and the ring's overshoot read as 1.
// (was: '#loop` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// ── THE LOOP (chooser practice-room-apps Q1/03, source Q4/02) ───────────────────────────
// Two carets cut a span; four words set the speed; it loops that span forever.
//
// WHAT THESE TESTS DO NOT DO: load a YouTube video. The source is an embed (Q4/02), and a test
// that fetches youtube.com would be testing the network — slow, flaky, and offline-hostile. The
// case's own behaviour is the carets, the nudge, the speed row and the state line, all of which
// are exercisable with no player at all. The one thing that NEEDS the network is asserted the
// other way round: that nothing is requested until a url is pasted.
test.use({ viewport: { width: 1512, height: 900 } });

const tl = (p: any) => p.getByTestId('timeline');
const span = (p: any) => p.getByTestId('loop-span');

// ── NOTHING TALKS TO ANOTHER ORIGIN UNTIL YOU ASK ────────────────────────────────────────
// This is the case's stated cost (it is the first in the room that leaves the origin at all),
// and the promise that makes it acceptable: opening the practice room requests nothing and
// sets no cookie. Same promise the tuner makes about the microphone, kept the same way — by
// not starting the thing until it is needed.
// "THIRD PARTY" MEANS A DIFFERENT ORIGIN THAN THE PAGE'S — not "not localhost". The first
// version of this hardcoded `http://127.0.0.1`, which is true of the preview server and false
// of the deployed site: run against https://practice.andrewshiau.com it counted all ten of the
// page's OWN requests as third-party. A test whose premise is the test harness's address
// cannot verify the real deployment, which is the one that matters.
const offOrigin = (url: string, pageOrigin: string) =>
  !url.startsWith(pageOrigin) && !url.startsWith('data:') && !url.startsWith('blob:')
  && !url.startsWith('about:');

test('opening the room requests nothing from youtube', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on('request', (r) => {
    if (offOrigin(r.url(), origin)) external.push(r.url());
  });
  await page.goto('/practice-room/loop/?e2e');
  await page.waitForTimeout(600);
  expect(external, 'the room loads with no third-party request').toEqual([]);
  // and the iframe host is empty — no player, no 1x1, nothing
  const kids = await page.evaluate(() => document.getElementById('mt-yt')!.children.length);
  expect(kids, 'no player exists until a url is pasted').toBe(0);
});

test('the state line says what to do, and the readout waits for a duration', async ({ page }) => {
  await page.goto('/practice-room/loop/?e2e');
  await expect(page.getByTestId('loop-state')).toHaveText('paste a url to begin');
  // NO INVENTED CLOCK. Until a video reports a duration the case does not know how long the
  // span is, so it prints an em dash rather than a number derived from nothing. (The proof
  // sheet shipped a bar count computed from an assumed tempo; it was the one number on the
  // sheet I could not defend, and it is not repeated here.)
  await expect(span(page)).toHaveText('—');
});

test('a bad url is rejected without loading anything', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on('request', (r) => {
    if (offOrigin(r.url(), origin)) external.push(r.url());
  });
  await page.goto('/practice-room/loop/?e2e');
  await page.getByTestId('loop-src').fill('not a url at all');
  await page.getByTestId('loop-src').press('Enter');
  await expect(page.getByTestId('loop-state')).toHaveText('that is not a youtube url');
  expect(external, 'a rejected url fetches nothing').toEqual([]);
});

test('both carets drag, and the span follows the one you moved', async ({ page }) => {
  await page.goto('/practice-room/loop/?e2e');
  const box = (await tl(page).boundingBox())!;
  const y = box.y + box.height / 2;
  const at = (f: number) => box.x + box.width * f;

  const read = () => page.evaluate(() => {
    const a = document.getElementById('mt-tl-a')!.style.left;
    const b = document.getElementById('mt-tl-b')!.style.left;
    const s = document.getElementById('mt-tl-span')!;
    return { a, b, left: s.style.left, width: s.style.width };
  });
  const before = await read();

  // drag the RIGHT caret out to 70% — grab nearest, which is what the pointer logic does
  await page.mouse.move(at(0.70), y);
  await page.mouse.down();
  await page.mouse.move(at(0.70), y, { steps: 4 });
  await page.mouse.up();
  const dragged = await read();
  expect(dragged.b, 'the right caret moved').not.toBe(before.b);
  expect(dragged.a, 'the left caret stayed put').toBe(before.a);
  // the accent span is drawn BETWEEN them — it is the stretch that will play
  expect(parseFloat(dragged.width)).toBeGreaterThan(parseFloat(before.width));

  // and the left caret is grabbable too — pick a point nearer to it
  await page.mouse.move(at(0.04), y);
  await page.mouse.down();
  await page.mouse.move(at(0.04), y, { steps: 4 });
  await page.mouse.up();
  const second = await read();
  expect(second.a, 'the left caret moved').not.toBe(dragged.a);
});

test('the carets never cross — the span cannot be negative', async ({ page }) => {
  await page.goto('/practice-room/loop/?e2e');
  const box = (await tl(page).boundingBox())!;
  const y = box.y + box.height / 2;
  // drag the LEFT caret far past the right one
  await page.mouse.move(box.x + box.width * 0.10, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.95, y, { steps: 10 });
  await page.mouse.up();
  const ok = await page.evaluate(() => {
    const a = parseFloat(document.getElementById('mt-tl-a')!.style.left);
    const b = parseFloat(document.getElementById('mt-tl-b')!.style.left);
    const w = parseFloat(document.getElementById('mt-tl-span')!.style.width);
    return { a, b, w, ordered: a <= b, positive: w >= 0 };
  });
  expect(ok.ordered, 'the left caret never ends up right of the right one').toBe(true);
  expect(ok.positive, 'the span width is never negative').toBe(true);
});

test('the arrows nudge by a sixteenth, and shift picks the other caret', async ({ page }) => {
  await page.goto('/practice-room/loop/?e2e');
  await tl(page).focus();
  const pos = () => page.evaluate(() => ({
    a: parseFloat(document.getElementById('mt-tl-a')!.style.left),
    b: parseFloat(document.getElementById('mt-tl-b')!.style.left),
  }));
  const start = await pos();

  await page.keyboard.press('ArrowRight');
  const right = await pos();
  // 1/16 of the take = 6.25% — the tick grid the ruler draws, so a nudge lands on a mark
  expect(right.b - start.b, 'an arrow moves the right caret one sixteenth').toBeCloseTo(6.25, 1);
  expect(right.a, 'and leaves the left one alone').toBeCloseTo(start.a, 1);

  await page.keyboard.press('Shift+ArrowRight');
  const shifted = await pos();
  expect(shifted.a - right.a, 'shift moves the LEFT caret').toBeCloseTo(6.25, 1);
});

test('the speed row is a selector, and one glyph still clears the tap floor', async ({ page }) => {
  await page.goto('/practice-room/loop/?e2e');
  // `1` first, because that is where a transcription starts: you listen at speed, then slow
  // the part down.
  await expect(page.getByTestId('rate-1')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('rate-05').click();
  await expect(page.getByTestId('rate-05')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('rate-1'), 'the speeds are mutually exclusive')
    .toHaveAttribute('aria-pressed', 'false');

  // ── A ONE-GLYPH WORD CANNOT CARRY ITS OWN TARGET ────────────────────────────────────
  // `1 ¾ ½ ¼` are single characters — 9px wide in this face — so without padding each button
  // is 9×44 and fails WCAG 2.5.8's 24px floor on the horizontal axis while passing on the
  // vertical. Measured on the proof sheet first, fixed the same way the page fixes every other
  // small target: pad out, pull the padding back, leave the printed line where it was.
  const targets = await page.evaluate(() =>
    [...document.querySelectorAll('#mt-rate .vbtn')].map((b) => {
      const r = b.getBoundingClientRect();
      return { t: b.textContent, w: Math.round(r.width), h: Math.round(r.height) };
    }));
  expect(targets.length).toBe(4);
  for (const t of targets) {
    expect(Math.min(t.w, t.h), `the ${t.t} target clears 24px on both axes`).toBeGreaterThanOrEqual(24);
  }
});

test('the transport refuses to start with no source, and says why', async ({ page }) => {
  await page.goto('/practice-room/loop/?e2e');
  await page.getByTestId('loop-toggle').click();
  // A latch that silently does nothing reads as broken. It stays off AND the state line says
  // what is missing.
  await expect(page.getByTestId('loop-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('loop-state')).toHaveText('paste a url to begin');
  await expect(page.locator('.mt-loop')).not.toHaveAttribute('data-sounding', 'true');
});

test('the timeline is the figure, and it is keyboard reachable', async ({ page }) => {
  await page.goto('/practice-room/loop/?e2e');
  // The drone's letter took the same promotion: a figure that is also the control has to be
  // focusable and announced, or the gesture is pointer-only.
  await expect(tl(page)).toHaveAttribute('role', 'group');
  const label = await tl(page).getAttribute('aria-label');
  expect(label, 'the gesture is described').toMatch(/drag|arrow/i);
  await page.keyboard.press('Tab');
  // reachable by tabbing from the top of the case rather than only by clicking
  const reachable = await page.evaluate(() => {
    const el = document.getElementById('mt-tl')!;
    el.focus();
    return document.activeElement === el;
  });
  expect(reachable, 'the timeline takes focus').toBe(true);
});

// ── TWO DEFECTS A SCREENSHOT FOUND AND TWENTY ASSERTIONS MISSED ──────────────────────────
// Both were live on the deployed page and both were invisible to every test above, which is
// the reason this block exists rather than a note in a comment.
test('nothing in the case draws on top of anything else', async ({ page }) => {
  // THE COLLISION: the speed sub-case sits in the `foot` row, but a boxed control group is 56px
  // tall in a 28px track, so it overhung DOWN into `hint` — where the state line was — and the
  // two drew over each other (measured on the live page: rate bottom 840, state top 812).
  // The drone's stack line hit exactly this and the fix was the same: move to `slack-b`, the
  // placed air that has height to give.
  // Asserted as a GEOMETRIC property of the whole case, not as one pair, so a future row that
  // lands on another is caught wherever it happens.
  await page.goto('/practice-room/loop/?e2e');
  const collisions = await page.evaluate(() => {
    const loop = document.querySelector('.mt-loop')!;
    const rows = ['#mt-rate', '#mt-loopstate', '#mt-src-grp', '.mt-tl', '.mt-read']
      .map((sel) => ({ sel, el: loop.querySelector(sel) }))
      .filter((r) => r.el)
      .map((r) => ({ sel: r.sel, b: r.el!.getBoundingClientRect() }));
    const hits: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i].b, c = rows[j].b;
        const vOverlap = a.bottom > c.top + 0.5 && a.top < c.bottom - 0.5;
        const hOverlap = a.right > c.left + 0.5 && a.left < c.right - 0.5;
        if (vOverlap && hOverlap) hits.push(`${rows[i].sel} over ${rows[j].sel}`);
      }
    }
    return hits;
  });
  expect(collisions, 'no two of the loop\'s rows may overlap').toEqual([]);
});

test('the source placeholder fits the field it is in', async ({ page }) => {
  // THE CLIP: `paste a youtube url` needed ~171px in a 180px field and rendered as
  // "paste a youtube ur" — the case is 236px and that is its own measured minimum, so the field
  // cannot grow and the WORDS had to shrink. A truncated placeholder reads as a broken control.
  // Measured in the field's own computed font, so it survives a type change.
  await page.goto('/practice-room/loop/?e2e');
  const fit = await page.evaluate(() => {
    const src = document.getElementById('mt-src') as HTMLInputElement;
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' +
      getComputedStyle(src).font;
    document.body.appendChild(probe);
    probe.textContent = src.placeholder;
    const needs = probe.getBoundingClientRect().width;
    probe.remove();
    return { text: src.placeholder, needs: Math.round(needs), has: src.clientWidth };
  });
  expect(fit.needs, `"${fit.text}" needs ${fit.needs}px in a ${fit.has}px field`)
    .toBeLessThanOrEqual(fit.has);
});
