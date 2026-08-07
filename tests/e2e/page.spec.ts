import { test, expect } from '@playwright/test';

// Page-level checks that don't need audio: the document loads, the controls are
// reachable, nothing threw on boot, and the A4 field clamps its range.

test('page boots clean: no console errors, controls present', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/practice-room/');
  await expect(page.getByTestId('mic-toggle')).toBeVisible();
  await expect(page.getByTestId('metro-toggle')).toBeVisible();
  // THREE cases now (chooser metrotuner-drone-box, Q1/02): the drone has its own square
  // and `tone-toggle` is gone with the tuner's second job. Its transport is the caption
  // under its own figure, like the other two.
  await expect(page.getByTestId('drone-toggle')).toBeVisible();
  await expect(page.getByTestId('semi-7'), 'the stack strip replaced the fifth latch').toBeVisible();
  await expect(page.getByTestId('voice-section'), 'and the voice is a setting').toBeVisible();
  await expect(page.getByTestId('tone-toggle')).toHaveCount(0);
  // BOTH calibration fields, ONE value (the user's refinement on Q4).
  await expect(page.getByTestId('a4')).toHaveValue('440');
  await expect(page.getByTestId('a4-drone')).toHaveValue('440');
  expect(errors).toEqual([]);
});

// ONE CALIBRATION BEHIND TWO FIELDS. The refinement the chooser's Q4 landed on was "both
// cases have a pitch calibration but they're synced" — so the failure this guards is two
// numbers drifting apart, which would silently mean the tuner and the drone disagree about
// what A is. Asserted in BOTH directions, because wiring one field's listener and not the
// other's passes a one-way test.
test('the two a4 fields are one value', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const tuner = page.getByTestId('a4');
  const drone = page.getByTestId('a4-drone');

  await tuner.fill('442');
  await tuner.blur();
  await expect(drone).toHaveValue('442');

  await drone.fill('438');
  await drone.blur();
  await expect(tuner).toHaveValue('438');

  // and the BINDING moved, not just the two input texts — a paint that skipped setA4()
  // would satisfy every assertion above.
  expect(await page.evaluate(() => (window as any).__mt.a4)).toBe(438);
});

test('A4 calibration clamps to 400–480', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const a4 = page.getByTestId('a4');
  await a4.fill('999');
  await a4.blur();
  await expect(a4).toHaveValue('480');
  await a4.fill('12');
  await a4.blur();
  await expect(a4).toHaveValue('400');
});

test('bpm clamps to 20–320', async ({ page }) => {
  await page.goto('/practice-room/');
  const bpm = page.getByTestId('bpm');
  await bpm.fill('999');
  await bpm.blur();
  await expect(bpm).toHaveValue('320');
  await bpm.fill('1');
  await bpm.blur();
  await expect(bpm).toHaveValue('20');
});

test('the controls are keyboard-reachable in order', async ({ page }) => {
  await page.goto('/practice-room/');
  // The tuner's foot is EMPTY now — `play tone` and the reference note left with the
  // sustained tone (Q4/01 "nothing sounds"). So the tab after the tuner's transport lands
  // on the METRONOME's first control rather than on a tone button in the same case.
  // Asserted as "the next stop is inside the next case" instead of naming one testid,
  // because the order within a case is a composition decision that has changed twice.
  const mic = page.getByTestId('mic-toggle');
  await mic.focus();
  await expect(mic).toBeFocused();
  await page.keyboard.press('Tab');
  const next = await page.evaluate(() => {
    const el = document.activeElement;
    return { case: el?.closest('.mt-half')?.getAttribute('aria-label') ?? null,
             testid: el?.getAttribute('data-testid') ?? null };
  });
  expect(next.case, 'focus left the tuner (its foot line is empty now)').toBe('Metronome');
});

// EVERY CASE'S TRANSPORT IS KEYBOARD-REACHABLE, and the drone's is new. A control added to
// the DOM but placed out of the tab order is the regression this catches.
test('all three transports take focus', async ({ page }) => {
  await page.goto('/practice-room/');
  for (const id of ['mic-toggle', 'metro-toggle', 'drone-toggle']) {
    const btn = page.getByTestId(id);
    await btn.focus();
    await expect(btn, `${id} must be focusable`).toBeFocused();
  }
});

// WHERE THE INSTRUMENT LIVES, PER HOST. `/practice-room/` is no longer a page on the
// apex — as of 2026-08-07 it 301s to practice.andrewshiau.com, so the instrument has one
// public address. These two specs used to `goto('/practice-room/')` unconditionally and
// went red the moment the redirect shipped: Playwright followed it to the subdomain while
// `request.get()` stayed on the configured baseURL, so the page and the fetched files were
// on different hosts. That is a correct failure, and the fix is to ask each host for the
// instrument at the address that host serves it from.
//
// Local preview has no subdomain vhost, so there the path IS still the instrument.
const ON_SUBDOMAIN = (process.env.E2E_BASE_URL || '').includes('practice.');
const APEX_REDIRECTS = /^https?:\/\/(www\.)?andrewshiau\.com/.test(process.env.E2E_BASE_URL || '');
const INSTRUMENT = ON_SUBDOMAIN ? '/' : '/practice-room/';

// THE HOME-SCREEN INSTALL CONTRACT (Layout's `installable` prop). What iOS actually
// reads: `apple-touch-icon` for the tile, the manifest for standalone display. The
// assertions fetch both referenced files and decode the icon's header — a link whose
// target 404s (or, on this nginx, answers 200 with index.html typed text/html) is the
// favicon-square bug again, and only checking bytes catches it.
test('home-screen install: manifest + touch icon resolve and are real', async ({ page, request }) => {
  // On the apex the instrument is not a page any more, so the contract there is the
  // REDIRECT, asserted below in its own test rather than skipped silently.
  test.skip(APEX_REDIRECTS, 'the apex 301s the instrument to its own host');
  await page.goto(INSTRUMENT);

  const touchIcon = page.locator('link[rel="apple-touch-icon"]');
  await expect(touchIcon).toHaveAttribute('href', '/practice-room/icon-180.png');
  const iconRes = await request.get('/practice-room/icon-180.png');
  expect(iconRes.status()).toBe(200);
  const png = await iconRes.body();
  // PNG magic + IHDR width/height at fixed offsets: 180×180, not an HTML fallback.
  expect(png.subarray(0, 4).toString('hex')).toBe('89504e47');
  expect(png.readUInt32BE(16)).toBe(180);
  expect(png.readUInt32BE(20)).toBe(180);

  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveAttribute('href', '/practice-room/manifest.json');
  const mres = await request.get('/practice-room/manifest.json');
  expect(mres.status()).toBe(200);
  const manifest = await mres.json();
  expect(manifest.display).toBe('standalone');
  // Same link URL, host-specific file: the subdomain's vhost serves manifest-root.json
  // there (the app IS its root), the apex serves the path-scoped one.
  const appRoot = ON_SUBDOMAIN ? '/' : '/practice-room/';
  expect(manifest.start_url).toBe(appRoot);
  expect(manifest.scope).toBe(appRoot);
  for (const icon of manifest.icons) {
    const r = await request.get(icon.src);
    expect(r.status()).toBe(200);
    expect((await r.body()).subarray(0, 4).toString('hex')).toBe('89504e47');
  }
});

test('the rest of the site does not carry the install head', async ({ page, baseURL }) => {
  // On practice.andrewshiau.com "/" IS the instrument, so this contract only exists
  // where "/" is the homepage — the apex and local preview.
  test.skip(ON_SUBDOMAIN, 'subdomain serves the app at /');
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(0);
});

// THE SUBDOMAIN + THE APP'S OWN FAVICON (2026-08-05). The instrument page links its
// own diagonal favicon set, not the site's ring-rule-disc; the favicon swap script
// must derive its base from the link (an is:inline script can't read frontmatter),
// so the assertion pins the href it derives from.
test('the instrument carries its own favicon set', async ({ page, request }) => {
  test.skip(APEX_REDIRECTS, 'the apex 301s the instrument to its own host');
  await page.goto(INSTRUMENT);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/practice-room/favicon.svg');
  await expect(page.locator('#favico')).toHaveAttribute('href', /\/practice-room\/favicon(-dark)?\.ico/);
  for (const f of ['favicon.svg', 'favicon.ico', 'favicon-dark.ico']) {
    const r = await request.get(`/practice-room/${f}`);
    expect(r.status()).toBe(200);
    const body = await r.body();
    expect(body.length).toBeGreaterThan(50);
    expect(body.subarray(0, 15).toString()).not.toContain('<!DOCTYPE');
  }
  // The homepage keeps the site's — except on the subdomain, where / IS the instrument.
  await page.goto('/');
  const homeIcon = ON_SUBDOMAIN ? '/practice-room/favicon.svg' : '/favicon.svg';
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', homeIcon);
});

// THE MOVE ITSELF, as a contract. Skipping the two specs above on the apex would leave the
// redirect untested — "it 301s now" is a claim, and an unasserted claim is how the old
// comment in Layout.astro came to say the apex redirected for two days while it served 200.
test('the apex sends the instrument to its own host, query intact', async ({ request }) => {
  test.skip(!APEX_REDIRECTS, 'only the apex redirects; the subdomain and preview serve it');
  for (const path of ['/practice-room/', '/practice-room']) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), `${path} must be a permanent redirect`).toBe(301);
    expect(res.headers().location).toBe('https://practice.andrewshiau.com/');
  }
  // The query has to survive: dropping ?e2e once broke 21 tests on the other vhost, and
  // the same $is_args$args is what carries it here.
  const withQuery = await request.get('/practice-room/?e2e', { maxRedirects: 0 });
  expect(withQuery.headers().location).toBe('https://practice.andrewshiau.com/?e2e');

  // And the files under the path must STILL be there, because the subdomain reads this
  // same webroot. A redirect is not a deletion — that is the whole distinction the move
  // rests on, so it is asserted rather than assumed.
  const onSub = await request.get('https://practice.andrewshiau.com/practice-room/manifest.json');
  expect(onSub.status()).toBe(200);
  expect((await onSub.json()).start_url).toBe('/');
});

// THE PRACTICE HOST IS FOR TOOLS, and every tool on it follows the same rule: served
// there, redirected from the apex, canonical naming the practice address. Asserted as a
// TABLE rather than one test per tool, so adding the next tool is a one-line change here
// and a red test if the routing is forgotten.
//
// This exists because the practice-room version of this claim sat in a comment for two
// days while being false — the apex served the page at 200 the whole time. A routing
// claim that nothing checks is a routing claim that drifts.
const PRACTICE_TOOLS = [
  { path: '/practice-room/', canonical: 'https://practice.andrewshiau.com/' },
  { path: '/pitchgraph/', canonical: 'https://practice.andrewshiau.com/pitchgraph/' },
];

// THE OLD ADDRESS KEEPS WORKING. /pitchgraph/ was published before the 2026-08-07 rename,
// so retiring the name does not retire the URL: the apex 301s it to the tool's new address
// on the practice host. Asserted separately from the table above because there is no page
// at /pitchgraph/ any more — only a redirect, so it has no canonical and no assets to check.
const RETIRED_PATHS = [
  { path: '/pitchgraph/', to: 'https://practice.andrewshiau.com/pitchgraph/' },
];

test('every practice tool is served on the practice host and disowned by the apex',
  async ({ request }) => {
    // LIVE-ONLY, and the skip is the honest part: these are absolute production URLs, so
    // running this against `astro preview` would report on the deployed site while
    // pretending to test the build in front of it — a green that means nothing about the
    // change you just made. It runs on the live-verify pass, where E2E_BASE_URL is set.
    test.skip(!process.env.E2E_BASE_URL, 'routing is a deployment fact; run with E2E_BASE_URL');
    for (const tool of PRACTICE_TOOLS) {
      // Served, with its assets, on the practice host. The host's catch-all 301s anything
      // it does not know to the apex, so a missing location block shows up as a redirect
      // where a 200 belongs — which is the likeliest way adding a tool goes wrong.
      const live = await request.get(tool.canonical, { maxRedirects: 0 });
      expect(live.status(), `${tool.canonical} must be served here`).toBe(200);
      const html = await live.text();
      expect(html, `${tool.path} must declare its own canonical`)
        .toContain(`<link rel="canonical" href="${tool.canonical}">`);

      // Every asset it references must resolve ON this host, not just on the apex.
      const assets = [...html.matchAll(/(?:href|src)="(\/_astro\/[^"]+)"/g)].map((m) => m[1]);
      expect(assets.length, `${tool.path} referenced no bundled assets — did it build?`)
        .toBeGreaterThan(0);
      for (const a of assets.slice(0, 6)) {
        const r = await request.get(`https://practice.andrewshiau.com${a}`, { maxRedirects: 0 });
        expect(r.status(), `${a} on the practice host`).toBe(200);
      }

      // And the apex path hands it over rather than serving a second copy.
      const apex = await request.get(`https://andrewshiau.com${tool.path}`, { maxRedirects: 0 });
      expect(apex.status(), `apex ${tool.path} must redirect`).toBe(301);
      expect(apex.headers().location).toBe(tool.canonical);
    }
  });

test('a retired tool address still 301s to the tool, query string intact',
  async ({ request }) => {
    // A renamed tool's old URL is a promise already made to whoever has the link. Same
    // live-only reason as above: this is a routing fact, and only the deployment has it.
    test.skip(!process.env.E2E_BASE_URL, 'routing is a deployment fact; run with E2E_BASE_URL');
    for (const old of RETIRED_PATHS) {
      const r = await request.get(`https://andrewshiau.com${old.path}`, { maxRedirects: 0 });
      expect(r.status(), `apex ${old.path} must still redirect`).toBe(301);
      expect(r.headers().location).toBe(old.to);
      // $is_args$args, asserted the same way the practice-room redirect asserts it — a
      // rule written without it silently eats ?e2e and every other query.
      const q = await request.get(`https://andrewshiau.com${old.path}?e2e`, { maxRedirects: 0 });
      expect(q.headers().location).toBe(`${old.to}?e2e`);
    }
  });
