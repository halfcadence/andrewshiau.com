#!/usr/bin/env python3
"""Regenerate the .ico favicons from MarkFigure.astro's own geometry.

Writes TWO files — `public/favicon.ico` (ink, for a light tab) and `public/favicon-dark.ico`
(paper, for a dark one). `Layout.astro` swaps between them on a `prefers-color-scheme` listener.

WHY THIS FILE EXISTS. The figure is one drawing in several copies. `MarkFigure.astro` is the
source of truth; `favicon.svg` is a hand copy the build DIFFS against it (see the assertions in
`src/pages/system.astro`). An `.ico` cannot be diffed that way — it is a raster — so instead it is
never edited by hand. Run this, commit the output.

WHY THERE IS AN .ICO AT ALL. `Layout.astro` points at the SVG first, and any browser that
understands `image/svg+xml` uses it and never asks for these files (Chrome/Edge 80+, Firefox 41+,
Safari 26+). But a browser that doesn't requests `/favicon.ico` on its own, at a fixed path, before
any markup tells it where to look. This site's nginx answers unknown paths with `index.html` at
status 200, so that request returned a 15 kB HTML document typed `text/html`; the browser could not
decode an image and drew its own placeholder tile — a SQUARE. That is the bug these files close.
The square was never in `favicon.svg`.

WHY TWO FILES RATHER THAN ONE COMPROMISE COLOUR. An `.ico` cannot carry a media query, so a single
file has to pick one colour. Ink measures 14.07:1 on Chrome's light tab and **1.38:1 on Safari's
dark one** — invisible. The best single grey (`#828178`, the site's warmth at optimal luminance)
lifts the worst case to 2.98:1, but costs the light case 14.07 → 2.99. Two files keep BOTH cases at
full contrast (ink 14.07:1 light, paper 10.87:1 dark), which is why this is the shipped answer.
The known cost, accepted: the swap needs JS, and the browsers that need the `.ico` at all cache
favicons hard enough that the swap may not take until a reload. A stale ink icon on a dark tab is
no worse than what one compromise colour would have given it.

NO BACKGROUND, EITHER FILE. Both are drawn on transparency. A filled square in either scheme is
precisely what the SVG deleted (see the long note in `public/favicon.svg`), and it is what the
user was seeing when the `.ico` was missing entirely.

WHY THE CLASSES ARE RESOLVED HERE. `favicon.svg` styles its shapes with CSS classes in a `<style>`
block. `rsvg` 2.40 — what `convert` delegates to on the dev box — IGNORES those classes and
rasterises a BLANK image, silently. So this script writes presentation attributes instead of
reading the SVG. Any future script that rasterises `favicon.svg` directly hits the same trap.

    python3 scripts/favicon-ico.py

Requires ImageMagick (`convert`). Prints the geometry it read and every frame's measured corner, so
the numbers are visible in the terminal rather than implied.
"""

import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMPONENT = ROOT / 'src' / 'components' / 'MarkFigure.astro'

# The three frames a browser picks from. One 16px frame upscales to a blur in the bookmark bar.
SIZES = (16, 32, 48)

# The two colours are `--ink` and the SVG's own dark-mode `.fg` — the same pair `favicon.svg`
# swaps between, so the .ico route and the SVG route draw the same two pictures rather than a
# third opinion. Measured on the tab grounds browsers actually paint (Chrome #dee1e6 / #35363a,
# Safari #f6f6f6 / #2f2f2f, Firefox #38383d): ink 14.07:1 light, paper 10.87:1 dark.
VARIANTS = {
    'favicon.ico':      ('#141412', 'ink, for a light tab'),
    'favicon-dark.ico': ('#f0efe8', 'paper, for a dark tab'),
}


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


def svg(g: dict, fg: str) -> str:
    """The figure, with every paint as an attribute rather than a class (see the module note)."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        f'<line x1="{g["x1"]}" y1="{g["x1"]}" x2="{g["x2"]}" y2="{g["x2"]}"'
        f' stroke="{fg}" stroke-width="{g["line_sw"]}"/>'
        f'<circle cx="10" cy="10" r="{g["r"]}" fill="none"'
        f' stroke="{fg}" stroke-width="{g["ring_sw"]}"/>'
        f'<circle cx="22" cy="22" r="{g["disc_r"]}" fill="{fg}"'
        f' stroke="{fg}" stroke-width="{g["disc_sw"]}"/>'
        '</svg>'
    )


def build(g: dict, name: str, fg: str, note: str) -> None:
    out = ROOT / 'public' / name
    with tempfile.TemporaryDirectory() as tmp:
        d = Path(tmp)
        (d / 'fig.svg').write_text(svg(g, fg))
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
        subprocess.run(['convert', *frames, str(out)], check=True)

    # Verify rather than assume, on BOTH files: every frame must be transparent at the corner, or
    # the whole point of them is lost. Red-tested by dropping `-background none` — the corner comes
    # back "white" and this exits.
    for i, s in enumerate(SIZES):
        corner = subprocess.run(
            ['convert', f'{out}[{i}]', '-format', '%[pixel:p{0,0}]', 'info:'],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if corner != 'none':
            sys.exit(
                f'{name} frame {s}px has a corner of "{corner}", not "none". The .ico grew a '
                'background — check that `-background none` survived.'
            )
    print(f'  {name:18} {fg}  {note}')
    print(f'{"":20} {len(SIZES)} frames, all corners transparent, '
          f'{out.stat().st_size} bytes')


def main() -> None:
    g = read_geometry(COMPONENT.read_text())
    print(f'{COMPONENT.name}: join {g["x1"]} -> {g["x2"]}, line {g["line_sw"]}, '
          f'circles r{g["r"]}/{g["ring_sw"]} and r{g["disc_r"]}/{g["disc_sw"]}')
    for name, (fg, note) in VARIANTS.items():
        build(g, name, fg, note)


if __name__ == '__main__':
    main()
