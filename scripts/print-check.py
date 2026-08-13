#!/usr/bin/env python3
"""Print a built page to PDF with headless Chrome and report what the ARTIFACT is.

    npm run build
    python3 scripts/print-check.py            # /resume/
    python3 scripts/print-check.py /method/    --keep

Why this exists — the mistake it is the fix for. `/resume/`'s print stylesheet was first
tuned by copying the `@media print` rules into a screen iframe, measuring the iframe's
height, and dividing by a page height. That reported "1.90 pages". The real export was
THREE, with every date wrapped and page 1 ending 40% empty. The simulation could not have
caught any of it: an iframe has no `@page`, no `break-inside`, and no pagination — it is
one tall column, and a column's height tells you nothing about where a printer breaks it.

So: print the real thing, read the real file back. Page count comes from the PDF, and the
per-page text shows where the breaks actually landed.

WHY A SERVER, and why loopback only. The built CSS and the four IBM Plex woff2 files are
referenced root-absolute (`/_astro/…`, `/fonts/…`). `file://` cannot resolve those, so a
`file://` render silently falls back to a system sans — you end up measuring a different
document in a different typeface, which is most of why the first downloaded PDF looked
worse than the site. The server binds 127.0.0.1 ONLY, runs in the foreground of this
process, and is closed in a `finally` block. Never 0.0.0.0: an unauthenticated server on
all interfaces is a CRITICAL Qualys finding on this machine and has been cited twice.
See CLAUDE.md, "Two rules that bite".

Chrome discovery and the loopback server are shared with og-shoot.py: scripts/_browser.py.
There is no npm dependency here — the site has one runtime dep and this script does not
add a second.
"""
import argparse
import os
import re
import subprocess
import sys

from _browser import find_chrome, serve_dir

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(REPO, "dist")
PORT = int(os.environ.get("PRINT_CHECK_PORT", "8127"))

# Letter at 96dpi minus the @page margins the stylesheet sets (14mm 16mm).
PAGE_PT = 792.0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default="/resume/", help="site path, e.g. /resume/")
    ap.add_argument("--out", default="/tmp/print-check.pdf")
    ap.add_argument("--quiet", action="store_true", help="page count only")
    args = ap.parse_args()

    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit("pypdf missing:  python3 -m pip install --user pypdf")

    if not os.path.isdir(DIST):
        sys.exit("dist/ not found — run `npm run build` first.")

    chrome = find_chrome()

    with serve_dir(DIST, PORT):
        url = f"http://127.0.0.1:{PORT}{args.path}"
        subprocess.run(
            [
                chrome, "--headless", "--no-sandbox", "--disable-gpu",
                "--no-pdf-header-footer", "--virtual-time-budget=6000",
                f"--print-to-pdf={args.out}", url,
            ],
            capture_output=True, timeout=180,
        )

    if not os.path.exists(args.out):
        sys.exit("Chrome produced no PDF.")

    r = PdfReader(args.out)
    pages = len(r.pages)
    print(f"{args.path} → {pages} page(s), {os.path.getsize(args.out)}B, {args.out}")
    if args.quiet:
        return 0

    all_text = ""
    for i, p in enumerate(r.pages, 1):
        text = p.extract_text() or ""
        all_text += text + "\n"
        lines = [l for l in text.split("\n") if l.strip()]
        # How full is the page? A short last page is the smell that a break landed badly.
        print(f"\n--- page {i}: {len(lines)} lines")
        for l in lines[:8]:
            print("   ", l[:76])
        if len(lines) > 8:
            print(f"    … {len(lines) - 8} more")

    # ── the assertions. Each one is a defect a look-at-it pass missed at least once.
    print("\nchecks:")
    orphan_dates = re.findall(r"^\s*(present|\d{4})\s*$", all_text, re.M)
    print(f"  date spans wrapping mid-range: {len(orphan_dates)}"
          f"{' ' + str(orphan_dates) if orphan_dates else ''}")

    # A hung label that overflows its column collides with the next cell, and the collision shows up
    # in the extracted text as two words run together with no space: "presentAmazon", "May 2025Void".
    # I read straight past exactly that string once — a check does not.
    #
    # Anchored to a DATE ending, not to any lowercase-then-capital pair: the first version of this
    # check flagged TypeScript, JavaScript and PowerPoint, which is a false positive that trains you
    # to ignore the check. The only thing that can collide here is the hung span, and a span always
    # ends in a year or "present".
    collisions = re.findall(r"((?:present|\d{4}))([A-Z][A-Za-z]{2,})", all_text)
    if collisions:
        print(f"  ⚠ THE DATE COLUMN IS OVERFLOWING into the next cell: "
              f"{[a + '|' + b for a, b in collisions][:6]}")
    else:
        print("  date column clears its cell (no span butted against an org name)")
    # EVERY EMBEDDED FONT MUST BE THE SITE'S OWN, and this check exists because a fallback shipped.
    # `font-weight:600` was requested only by the print stylesheet, so the SemiBold woff2 was never
    # fetched during screen layout and was not cached when Chrome ran print layout — which does not
    # wait for a font. The three section heads fell through to the generic `monospace` tail and the
    # PDF embedded `DejaVuSansMono-Bold` beside two IBM Plex faces. Page count was green throughout;
    # the extracted text was identical; only the font table showed it.
    fonts = set()
    for p in r.pages:
        for _, ref in (p.get("/Resources", {}) or {}).get("/Font", {}).items():
            base = ref.get_object().get("/BaseFont")
            if base:
                # strip the "AAAAAA+" subset tag Chrome prefixes
                fonts.add(str(base).lstrip("/").split("+")[-1])
    alien = sorted(f for f in fonts if not f.startswith("IBMPlexMono"))
    if alien:
        print(f"  ⚠ FALLBACK TYPEFACE IN THE PDF: {alien}. A weight requested only in print is not"
              f" cached when print layout runs — use a weight the screen already uses, or preload"
              f" the woff2. All fonts found: {sorted(fonts)}")
    else:
        print(f"  every embedded font is IBM Plex Mono {sorted(fonts)}")

    last = [l for l in (r.pages[-1].extract_text() or "").split("\n") if l.strip()]
    if pages > 1 and len(last) < 8:
        print(f"  LAST PAGE IS THIN — {len(last)} lines. A sheet carrying a few lines is the"
              f" worst length for something printed and stapled; tighten the scale or cut copy.")
    else:
        print(f"  last page carries {len(last)} lines")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
