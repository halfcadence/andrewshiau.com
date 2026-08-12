#!/usr/bin/env python3
"""Regenerate public/og.png from tools/og-card.html, and ASSERT it still matches the site.

    npm run build && python3 scripts/og-shoot.py

Why this script exists rather than the README's manual recipe: the old card went stale for
months and nobody noticed, because "copy the file into public/, run the dev server, screenshot
the element by hand" is a procedure with no check in it. Layout.astro carried a `KNOWN STALE`
comment instead of a failing build. A raster that quotes the site has to be verified against
the site, or it is just a picture that used to be true.

What it asserts, before and after the capture:
  1. The claim on the card is the index's h1, character for character.
  2. The `Currently` line on the card is the index panel's, character for character.
  3. The figure's six geometry numbers match MarkFigure.astro's `both` case.
  4. Graphik and the retired olive appear nowhere in the card.
  5. The produced PNG is exactly 1200×630 and under 200kB.

Server: 127.0.0.1 only, foreground, closed in a `finally`. Never 0.0.0.0 — an unauthenticated
server bound to all interfaces on the dev desktop is a CRITICAL Qualys finding. Same pattern as
scripts/print-check.py, which is the sanctioned exception on this box.
"""
import functools, http.server, os, re, shutil, socketserver, struct, subprocess, sys, threading, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
CARD = os.path.join(ROOT, "tools", "og-card.html")
INDEX = os.path.join(ROOT, "src", "pages", "index.astro")
MARK = os.path.join(ROOT, "src", "components", "MarkFigure.astro")
OUT = os.path.join(ROOT, "public", "og.png")
PORT = 8931
SERVED_NAME = "__og-card.html"   # temporary, inside dist/ only

CHROMES = [
    os.environ.get("CHROME", ""),
    "/tmp/chromium-1208/chrome-linux64/chrome",
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]


def find_chrome() -> str:
    for c in CHROMES:
        if c and os.path.exists(c):
            return c
    sys.exit("No Chrome found. Set CHROME=/path/to/chrome.")


def norm(s: str) -> str:
    """Collapse whitespace and normalise the apostrophes JSX/HTML disagree about."""
    return re.sub(r"\s+", " ", s).replace("’", "'").replace("&#39;", "'").strip()


def fail(msg: str):
    sys.exit(f"FAIL: {msg}")


def count_dark(png: str, y0: int, y1: int, thresh: int = 150) -> int:
    """Count pixels darker than `thresh` in the horizontal band [y0, y1).

    Hand-rolled PNG decode — no Pillow on this box, and adding a dependency to count pixels in
    one 1200×630 raster is not worth it. Handles the five filter types and truecolour (type 2),
    which is what Chrome emits here; asserts anything else rather than guessing.
    """
    d = open(png, "rb").read()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        fail("not a PNG")
    pos, idat, w, h, ct = 8, b"", None, None, None
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos + 4])[0]
        typ = d[pos + 4:pos + 8]
        if typ == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", d[pos + 8:pos + 18])
            if bd != 8 or ct not in (2, 6):
                fail(f"unexpected PNG format: bitdepth {bd}, colortype {ct}")
        elif typ == b"IDAT":
            idat += d[pos + 8:pos + 8 + ln]
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = 4 if ct == 6 else 3
    stride = w * ch
    n, i, prev = 0, 0, bytearray(stride)
    for y in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i + stride]); i += stride
        if f == 1:
            for x in range(ch, stride):
                line[x] = (line[x] + line[x - ch]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        if y0 <= y < y1:
            for x in range(w):
                if line[x * ch] < thresh:
                    n += 1
        prev = line
    return n


def main() -> None:
    card = open(CARD, encoding="utf-8").read()
    index = open(INDEX, encoding="utf-8").read()
    mark = open(MARK, encoding="utf-8").read()

    # ── 1. the claim is the index's h1, verbatim ────────────────────────────────────────
    m = re.search(r'<h1 class="statement">(.*?)</h1>', index, re.S)
    if not m:
        fail("could not find the index's <h1 class=\"statement\"> — did it get renamed?")
    want_claim = norm(m.group(1))

    m = re.search(r'<h1 class="say">(.*?)</h1>', card, re.S)
    if not m:
        fail("could not find the card's <h1 class=\"say\">")
    got_claim = norm(m.group(1))

    if got_claim != want_claim:
        fail("the card's claim is not the index's h1.\n"
             f"  index: {want_claim}\n"
             f"  card : {got_claim}\n"
             "Fix tools/og-card.html — the card quotes the page, not the other way round.")

    # ── 2. the Currently line matches the index panel ───────────────────────────────────
    m = re.search(r'<span class="pv">(Designing[^<]*)</span>', index)
    if not m:
        fail("could not find the index panel's `Currently` value (span.pv)")
    want_now = norm(m.group(1))
    m = re.search(r'<span class="v">([^<]*)</span>', card)
    if not m:
        fail("could not find the card's foot value")
    got_now = norm(m.group(1))
    if got_now != want_now:
        fail(f"card `Currently` != index `Currently`.\n  index: {want_now}\n  card : {got_now}")

    # ── 3. the figure's geometry matches MarkFigure.astro's `both` case ─────────────────
    both = mark.split("side === 'both'")[1].split("</svg>")[0]
    for token in ('x1="13.54"', 'y1="13.54"', 'x2="18.46"', 'y2="18.46"',
                  'cx="10" cy="10" r="5"', 'cx="22" cy="22" r="5"'):
        if token not in both:
            fail(f"MarkFigure.astro no longer contains {token} — the mark's geometry moved. "
                 "Update tools/og-card.html to match, then re-run.")
        if token not in card:
            fail(f"the card's figure is missing {token}, which MarkFigure.astro has. "
                 "The mark on the card would not be the site's mark.")
    if 'stroke-width="1.8"' not in card:
        fail("the card's circles are missing the 1.8 stroke — ring and disc would differ in size")

    # ── 4. nothing retired survives in the card ─────────────────────────────────────────
    # COMMENTS ARE STRIPPED FIRST, and that is not a detail — the first cut of this check
    # scanned the raw file and failed on the word "Graphik" inside the comment that documents
    # Graphik as RETIRED. A check that fires on its own documentation is a check that gets
    # deleted the third time it cries wolf, so it reads the live CSS and markup only.
    # Caught by red-casing the olive case, which reported the Graphik line instead.
    live = re.sub(r"<!--.*?-->", "", card, flags=re.S)
    for dead, why in (("Graphik", "the typeface is retired; its woff2 files are deleted"),
                      ("5c6b12", "the olive --build is retired entirely"),
                      ("text-transform:uppercase", "the mono pass deleted caps-plus-tracking")):
        if dead in live:
            fail(f"tools/og-card.html still sets `{dead}` — {why}")

    if not os.path.isdir(DIST):
        sys.exit("dist/ not found — run `npm run build` first.")

    served = os.path.join(DIST, SERVED_NAME)
    shutil.copyfile(CARD, served)

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=DIST))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        # ── PLAYWRIGHT, NOT `chrome --headless --screenshot`, AND THE REASON IS A REAL DEFECT.
        # The first cut of this script shot the card with headless Chrome's own --screenshot
        # flag plus --virtual-time-budget=8000. It produced a 1200×630 PNG that passed every
        # assertion in this file — and the FOOT ROW WAS BLANK. The claim and the mast painted;
        # "Currently / Designing the Amazon store with AI." did not.
        # Isolated by measuring instead of guessing: a layout probe reported the foot at
        # y=521..574, comfortably inside the canvas, with display:grid, visibility:visible,
        # opacity 1, colour rgb(20,20,18) and the real text in both spans. Counting dark pixels
        # in that band of the produced PNG gave ZERO. Screenshotting the same served URL through
        # Playwright painted it correctly. So the layout was always right and the CAPTURE was
        # wrong — --virtual-time-budget fast-forwards timers and fires the capture before the
        # webfont-driven final layout is composited, and the last box on the page is the one
        # that loses.
        # This is exactly the class of bug the print-check rule exists for: a green build, a
        # correctly-sized artifact, and a third of the content missing. The assertions above
        # cannot catch it — they read the SOURCE. Only the pixels can, which is why the ink
        # check below is not optional.
        r = subprocess.run(
            ["node", os.path.join(ROOT, "tools", "og-capture.mjs"),
             f"http://127.0.0.1:{PORT}/{SERVED_NAME}", OUT],
            capture_output=True, timeout=180, cwd=ROOT, text=True,
        )
        if r.returncode != 0:
            fail(f"capture failed:\n{r.stdout}\n{r.stderr}")
        capture_report = r.stdout.strip()
    finally:
        srv.shutdown()
        srv.server_close()
        if os.path.exists(served):
            os.remove(served)   # must never deploy: it would be a real route

    if not os.path.exists(OUT):
        fail("Chrome produced no PNG")

    # ── 5. the artifact itself ──────────────────────────────────────────────────────────
    with open(OUT, "rb") as f:
        head = f.read(33)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        fail("output is not a PNG")
    w, h = struct.unpack(">II", head[16:24])
    size = os.path.getsize(OUT)
    if (w, h) != (1200, 630):
        fail(f"PNG is {w}×{h}, not 1200×630 (Layout.astro hardcodes the dimensions)")
    if size > 200_000:
        fail(f"PNG is {size:,}B — over 200kB; unfurl fetchers time out on slow links")

    # ── 6. THE PIXELS, PER BAND — the check that would have caught the blank foot.
    # Everything above reads the source; a card can pass all of it and still paint a third of
    # itself blank (it did — see the capture note). So decode the PNG and require ink in each
    # of the three bands the card is built from. Thresholded at 150 rather than 120: the foot's
    # label is --faint #6e6d64 (110,109,100), which a stricter cut misses even when painted.
    bands = {"mast": (56, 105), "claim": (200, 440), "foot": (515, 590)}
    ink = {k: count_dark(OUT, a, b) for k, (a, b) in bands.items()}
    blank = [k for k, n in ink.items() if n < 200]
    if blank:
        fail(f"bands with (almost) no ink: {', '.join(blank)}  — measured {ink}\n"
             "The layout can be correct and the capture still miss it. This is the assertion "
             "that catches a capture firing before the webfont settles the final layout.")

    print(f"og.png  {w}×{h}  {size:,}B")
    print(f"ink     mast {ink['mast']:,} · claim {ink['claim']:,} · foot {ink['foot']:,} dark px")
    print(f"boxes   {capture_report}")
    print(f"claim   {want_claim[:78]}")
    print(f"now     {want_now}")
    print("asserts claim==index h1, Currently==index panel, mark==MarkFigure, no Graphik/olive")


if __name__ == "__main__":
    main()
