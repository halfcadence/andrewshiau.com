#!/usr/bin/env python3
"""Regenerate the practice room's home-screen icons.

Writes three PNGs into `public/practice-room/`:

    icon-180.png   apple-touch-icon (iOS reads exactly this size for the home screen)
    icon-192.png   manifest icon (Android / anything that reads the manifest)
    icon-512.png   manifest icon, splash-sized

THE DRAWING IS THE INSTRUMENT'S OWN FIGURE: the arc rail, the pendulum arm and bob,
the pivot dot — the round-7 "arm and bob" silhouette from practice-room.astro, at the
arm's real park angle. -54° is not a styling choice: it is PARK_LEFT in the page's own
script, the angle the arm rests at before the first sweep. The icon is the instrument
at rest.

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
import math
import subprocess
import tempfile
from pathlib import Path

PAPER = '#f4f3ef'   # --paper, light scheme
INK = '#141412'     # --ink
FAINT = '#6e6d64'   # --faint (the rail, same as the page's arc)

PARK_DEG = 54       # PARK_LEFT in practice-room.astro — the arm's rest angle

OUT = Path(__file__).resolve().parent.parent / 'public' / 'practice-room'


def svg(size: int) -> str:
    # 64-unit box; pivot low-centre like the page's 320×184 figure, margins generous
    # because iOS rounds the corners off whatever we hand it.
    cx, cy, r, arm, bob = 32.0, 44.0, 25.0, 21.0, 4.2
    a = math.radians(PARK_DEG)
    bx, by = cx - arm * math.sin(a), cy - arm * math.cos(a)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">
  <rect width="64" height="64" fill="{PAPER}"/>
  <path d="M {cx - r} {cy} A {r} {r} 0 0 1 {cx + r} {cy}" fill="none" stroke="{FAINT}" stroke-width="1.4"/>
  <line x1="{cx}" y1="{cy}" x2="{bx:.2f}" y2="{by:.2f}" stroke="{INK}" stroke-width="1.7"/>
  <circle cx="{bx:.2f}" cy="{by:.2f}" r="{bob}" fill="{INK}"/>
  <circle cx="{cx}" cy="{cy}" r="2" fill="{INK}"/>
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
