#!/usr/bin/env python3
"""Regenerate the practice room's home-screen icons.

Writes three PNGs into `public/practice-room/`:

    icon-180.png   apple-touch-icon (iOS reads exactly this size for the home screen)
    icon-192.png   manifest icon (Android / anything that reads the manifest)
    icon-512.png   manifest icon, splash-sized

THE DRAWING IS THE DIAGONAL — the mark's rule alone, one round-capped stroke at 45°
(chooser: practice-room-icon-2, pick 07 "rly cool"). It is the favicon's diagonal and
the subdivide stair's angle, borrowed from the site's mark without repeating it: the
ring and disc stay the site's, the rule between them becomes the app's.
The first icon (round 1, rejected as "pretty ugly") was the instrument figure at 1:1 —
arc rail, arm and bob at the park angle — whose hairline weights vanished at 60px.

OPAQUE PAPER BACKGROUND, DELIBERATELY. An apple-touch-icon with transparency gets
composited onto BLACK by iOS, so the site's favicon rule ("no background, either mode")
inverts here: the icon must carry its own paper. One light-mode icon only — iOS has no
dark-variant mechanism for web app icons, and ink on paper is the figure's common case.

WHY PRESENTATION ATTRIBUTES AND NOT CSS CLASSES: same trap as scripts/favicon-ico.py —
`convert` on this box delegates SVG to rsvg 2.40, which silently ignores a <style>
block and rasterises blank. Hexes are inlined below for the same reason the favicon's
are: a generated SVG cannot read global.css. They must match --paper/--ink/--faint
(light scheme) in src/styles/global.css. Change one, change both.

    python3 scripts/practice-room-icons.py

Requires ImageMagick (`convert`). Run it, commit the output — the PNGs are never
edited by hand.
"""

import subprocess
import tempfile
from pathlib import Path

PAPER = '#f4f3ef'   # --paper, light scheme
INK = '#141412'     # --ink

OUT = Path(__file__).resolve().parent.parent / 'public' / 'practice-room'


def svg(size: int) -> str:
    # 64-unit box; the stroke runs corner-to-corner of the mark's own join geometry
    # (13.54→18.46 in a 32 box, doubled), margins generous because iOS rounds the
    # corners off whatever we hand it.
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">
  <rect width="64" height="64" fill="{PAPER}"/>
  <line x1="19" y1="19" x2="45" y2="45" stroke="{INK}" stroke-width="5.5" stroke-linecap="round"/>
</svg>'''


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (180, 192, 512):
        with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f:
            f.write(svg(size))
            tmp = f.name
        dest = OUT / f'icon-{size}.png'
        subprocess.run(['convert', tmp, str(dest)], check=True)
        Path(tmp).unlink()
        ident = subprocess.run(['identify', str(dest)], capture_output=True, text=True, check=True)
        print(ident.stdout.strip())


if __name__ == '__main__':
    main()
