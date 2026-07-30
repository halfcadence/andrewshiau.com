#!/usr/bin/env python3
"""Regenerate public/favicon.ico from MarkFigure.astro's own geometry.

WHY THIS FILE EXISTS. The figure is one drawing in several copies. `MarkFigure.astro` is the
source of truth; `favicon.svg` is a hand copy the build DIFFS against it (see the assertions in
`src/pages/system.astro`). `favicon.ico` cannot be diffed that way — it is a raster — so instead
it is never edited by hand. Run this, commit the output.

WHY THERE IS AN .ICO AT ALL. `Layout.astro` points at the SVG, and any browser that understands
`image/svg+xml` uses it and never asks for this file. But a browser that doesn't requests
`/favicon.ico` on its own, at a fixed path, before any markup tells it where to look. This site's
nginx answers unknown paths with `index.html` at status 200, so that request returned a 15 kB HTML
document typed `text/html`; the browser could not decode an image and drew its own placeholder
tile — a SQUARE. That is the bug this file closes. The square was never in `favicon.svg`.

NO BACKGROUND, ONE COLOUR. An `.ico` cannot carry `prefers-color-scheme`, so it gets ink on
transparency rather than a light-mode square. A filled square in either scheme is precisely what
the SVG deleted (see the long note in `public/favicon.svg`).

WHY THE CLASSES ARE RESOLVED HERE. `favicon.svg` styles its shapes with CSS classes in a `<style>`
block. `rsvg` 2.40 — what `convert` delegates to on the dev box — IGNORES those classes and
rasterises a BLANK image, silently. So this script writes presentation attributes instead of
reading the SVG. Any future script that rasterises `favicon.svg` directly hits the same trap.

    python3 scripts/favicon-ico.py

Requires ImageMagick (`convert`). Prints the geometry it read so the numbers are visible in the
terminal rather than implied.
"""

import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMPONENT = ROOT / 'src' / 'components' / 'MarkFigure.astro'
OUT = ROOT / 'public' / 'favicon.ico'

# The three frames a browser picks from. One 16px frame upscales to a blur in the bookmark bar.
SIZES = (16, 32, 48)

# Ink. Matches `--ink` / the favicon's light-mode `.fg`, and is the one colour the .ico can have.
INK = '#141412'


def read_geometry(src: str) -> dict:
    """Pull the PAIRED figure's numbers out of the component.

    Matches on the pair's own centres (10 and 22) so the one-sided marks (r=7.2, centred at 16)
    can't be picked up by mistake — the same distinction the build assertion had to learn.
    """
    line = re.search(r'<line x1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*stroke-width="([\d.]+)"', src)
    ring = re.search(r'<circle cx="10" cy="10" r="([\d.]+)"[^>]*stroke-width="([\d.]+)"', src)
    disc = re.search(r'<circle cx="22" cy="22" r="([\d.]+)"[^>]*stroke-width="([\d.]+)"', src)
    if not (line and ring and disc):
        sys.exit(
            f'{COMPONENT.name}: could not find the paired figure. The markup changed shape — '
            'update these patterns, and check favicon.svg still agrees while you are there.'
        )
    return {
        'x1': line.group(1), 'x2': line.group(2), 'line_sw': line.group(3),
        'r': ring.group(1), 'ring_sw': ring.group(2),
        'disc_r': disc.group(1), 'disc_sw': disc.group(2),
    }


def svg(g: dict) -> str:
    """The figure, with every paint as an attribute rather than a class (see the module note)."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        f'<line x1="{g["x1"]}" y1="{g["x1"]}" x2="{g["x2"]}" y2="{g["x2"]}"'
        f' stroke="{INK}" stroke-width="{g["line_sw"]}"/>'
        f'<circle cx="10" cy="10" r="{g["r"]}" fill="none"'
        f' stroke="{INK}" stroke-width="{g["ring_sw"]}"/>'
        f'<circle cx="22" cy="22" r="{g["disc_r"]}" fill="{INK}"'
        f' stroke="{INK}" stroke-width="{g["disc_sw"]}"/>'
        '</svg>'
    )


def main() -> None:
    g = read_geometry(COMPONENT.read_text())
    print(f'{COMPONENT.name}: join {g["x1"]} -> {g["x2"]}, line {g["line_sw"]}, '
          f'circles r{g["r"]}/{g["ring_sw"]} and r{g["disc_r"]}/{g["disc_sw"]}')

    with tempfile.TemporaryDirectory() as tmp:
        d = Path(tmp)
        (d / 'fig.svg').write_text(svg(g))
        frames = []
        for s in SIZES:
            png = d / f'{s}.png'
            # `-background none` is what keeps the alpha; without it the corners fill white and
            # the square comes straight back.
            subprocess.run(
                ['convert', '-background', 'none', str(d / 'fig.svg'),
                 '-resize', f'{s}x{s}', str(png)],
                check=True,
            )
            frames.append(str(png))
        subprocess.run(['convert', *frames, str(OUT)], check=True)

    # Verify rather than assume: every frame must be transparent at the corner, or the whole point
    # of the file is lost.
    for i, s in enumerate(SIZES):
        corner = subprocess.run(
            ['convert', f'{OUT}[{i}]', '-format', '%[pixel:p{0,0}]', 'info:'],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if corner != 'none':
            sys.exit(
                f'{OUT.name} frame {s}px has a corner of "{corner}", not "none". The .ico grew a '
                'background — check that `-background none` survived.'
            )
        print(f'  {s}x{s}  corner transparent')

    print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
