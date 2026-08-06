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
  await expect(page.getByTestId('tone-toggle')).toBeVisible();
  await expect(page.getByTestId('a4')).toHaveValue('440');
  expect(errors).toEqual([]);
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
  // Tab from the top of the document; the mic toggle is the first control after
  // the panel's link home.
  const mic = page.getByTestId('mic-toggle');
  await mic.focus();
  await expect(mic).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('tone-toggle')).toBeFocused();
});

// THE HOME-SCREEN INSTALL CONTRACT (Layout's `installable` prop). What iOS actually
// reads: `apple-touch-icon` for the tile, the manifest for standalone display. The
// assertions fetch both referenced files and decode the icon's header — a link whose
// target 404s (or, on this nginx, answers 200 with index.html typed text/html) is the
// favicon-square bug again, and only checking bytes catches it.
test('home-screen install: manifest + touch icon resolve and are real', async ({ page, request }) => {
  await page.goto('/practice-room/');

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
  expect(manifest.start_url).toBe('/practice-room/');
  expect(manifest.scope).toBe('/practice-room/');
  for (const icon of manifest.icons) {
    const r = await request.get(icon.src);
    expect(r.status()).toBe(200);
    expect((await r.body()).subarray(0, 4).toString('hex')).toBe('89504e47');
  }
});

test('the rest of the site does not carry the install head', async ({ page, baseURL }) => {
  // On practice.andrewshiau.com "/" IS the instrument, so this contract only exists
  // where "/" is the homepage — the apex and local preview.
  test.skip(!!baseURL?.includes('practice.'), 'subdomain serves the app at /');
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(0);
});

// THE SUBDOMAIN + THE APP'S OWN FAVICON (2026-08-05). The instrument page links its
// own diagonal favicon set, not the site's ring-rule-disc; the favicon swap script
// must derive its base from the link (an is:inline script can't read frontmatter),
// so the assertion pins the href it derives from.
test('the instrument carries its own favicon set', async ({ page, request }) => {
  await page.goto('/practice-room/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/practice-room/favicon.svg');
  await expect(page.locator('#favico')).toHaveAttribute('href', /\/practice-room\/favicon(-dark)?\.ico/);
  for (const f of ['favicon.svg', 'favicon.ico', 'favicon-dark.ico']) {
    const r = await request.get(`/practice-room/${f}`);
    expect(r.status()).toBe(200);
    const body = await r.body();
    expect(body.length).toBeGreaterThan(50);
    expect(body.subarray(0, 15).toString()).not.toContain('<!DOCTYPE');
  }
  // The homepage keeps the site's.
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
});
