#!/usr/bin/env python3
"""Build the /practice-room/ OPEN FINDINGS chooser — the two research results
that were reported but not acted on.

  Q1 — the frame inset: 28px (--gutter) is 3.111 characters, so the hairline
       and the type ladder are out of phase by 1px. MIL-STD-1472G states legend
       clearance in glyph widths; 3ch = 27px puts them in phase.
  Q2 — the figure's radii: the bob (outer r=122vb) overlaps the tick band
       (inner r=118vb) by 4 viewBox units. The same standard: the pointer
       "shall extend to, but not overlap, the shortest scale graduation marks."

Every image is the real page (crops at 3-4x device scale, options applied for
real over loopback). Numbers live in DATA below; nothing is hand-typed twice.

  python3 tools/build-findings-chooser.py
"""
import base64
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/local/home/shiauas/workplace/work/understand/'
                   'practice-room-findings/index.html')
SHOTS = json.load(open('/tmp/proofshots3.json'))

FONTS = []
for name, weight, style in [('IBMPlexMono-Regular', 400, 'normal'),
                            ('IBMPlexMono-Medium', 500, 'normal'),
                            ('IBMPlexMono-Italic', 400, 'italic')]:
    b64 = base64.b64encode((REPO / 'public' / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    FONTS.append((weight, style, b64))

# ── the data ─────────────────────────────────────────────────────────────────
# viewBox radii from the pivot (160,160), read from the SVG source:
RADII = [
    ('the arm’s end / bob centre', 116, 'line y2=44; circle cy=44'),
    ('tick inner (the scale)', 118, 'line y2=42'),
    ('bob outer edge', 122, 'cy=44 + r=6'),
    ('the arc', 126, 'A 126 126'),
    ('tick outer', 134, 'y1=26'),
]

Q1 = [
    dict(n='01', name='Current — 28px (--gutter)', shot='inset-28',
         why='The inset is the site’s spacing token, borrowed sideways. 28px = 3.111 '
             'characters, so the hairline sits a third of a cell off the type’s own ladder — '
             'the frame and the text never share a line.',
         cost='Nothing today; it is the origin every flush mark measures from, so the whole '
              'content ladder is phase-shifted 1px from the frame.'),
    dict(n='02', name='3ch — 27px, the glyph’s own unit', shot='inset-27',
         why='MIL-STD-1472G §5.2.3.14.12: legend clearance is stated in the width of the '
             'letter H — in this face exactly 1ch = 9px. At 3ch the hairline IS a cell '
             'boundary: frame and type are one ladder.',
         cost='1px per side. Also unpins the inset from --gutter: if the type size ever '
              'changes, the inset follows the glyph, not the spacing scale — which is either '
              'the point or a new coupling, depending on where you stand.'),
]

Q2 = [
    dict(n='01', name='Current — bob overlaps the tick', shot='radii-current',
         why='The bob’s outer edge (r=122) crosses the tick band (inner r=118) by 4 viewBox '
             'units, so at centre the disc eats the lower third of the in-tune mark. '
             'MIL-STD-1472G: the pointer "shall extend to, but not overlap, the shortest '
             'scale graduation marks."',
         cost='The moment of exact tune is the one reading where the mark is most obscured.'),
    dict(n='02', name='Shorter arm — bob stops at the tick', shot='radii-arm48',
         why='Arm and bob move in 4vb (cy 44 → 48): the bob’s outer edge lands exactly on '
             'the tick’s inner end. The tick stays full length; pointer and scale meet and '
             'never cross — the standard’s own geometry.',
         cost='The needle reads very slightly shorter against the arc. Both figures change '
              '(the pendulum shares the drawing).'),
    dict(n='03', name='Longer tick — the band starts above the bob', shot='radii-tick38',
         why='The tick’s inner end moves out (y2 42 → 38) so the band begins where the bob '
             'ends. The arm keeps its full reach.',
         cost='The tick shortens from 16vb to 12vb — the in-tune mark loses a quarter of '
              'its length, which is backwards: the scale yields to the pointer.'),
    dict(n='04', name='Smaller bob — r=2', shot='radii-bob2',
         why='The bob shrinks until its edge clears the tick (r 6 → 2).',
         cost='The bob stops reading as a bob — it is the pendulum’s weight and the '
              'needle’s head, and at r=2 it is a dot on a line. The drawing loses its '
              'Wittner silhouette.'),
]


def shot(key, cap):
    return (f'<figure class="sh"><img alt="{cap}" src="data:image/png;base64,{SHOTS[key]}">'
            f'<figcaption>{cap}</figcaption></figure>')


def options(qs, wide=False):
    rows = []
    for o in qs:
        rows.append(f'''
    <div class="opt">
      <div class="ohd">
        <span class="on">{o['n']}</span>
        <span class="om">{o['name']}</span>
        <span class="ow">{o['why']}</span>
      </div>
      <p class="nt"><b>Cost.</b> {o['cost']}</p>
      <div class="shots{' wide' if wide else ''}">{shot(o['shot'], 'the real page, magnified')}</div>
    </div>''')
    return '\n'.join(rows)


rrows = '\n'.join(
    f'<tr><td>{n}</td><td class="num">{r}</td><td class="fine">{src}</td></tr>'
    for n, r, src in RADII)

faces = '\n'.join(
    f'''@font-face{{font-family:"Plex";font-weight:{w};font-style:{s};font-display:swap;
  src:url(data:font/woff2;base64,{b64}) format("woff2")}}''' for w, s, b64 in FONTS)

picker = (pathlib.Path.home() / '.claude/skills/proofs/picker.html').read_text()
toggle = (pathlib.Path.home() / '.claude/skills/proofs/theme-toggle.html').read_text()

HTML = f'''<!doctype html>
<html lang="en" data-t="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Practice room — two open findings from the research pass</title>
<style>
{faces}
:root{{
  color-scheme: light dark;
  --paper:#f4f3ef; --panel:#ffffff; --ink:#141412; --dim:#5f5e57; --faint:#6e6d64;
  --line:#d5d4cd; --accent:#14306b; --build:#14306b; --on-accent:#ffffff;
  --step:15px; --lead:28px; --unit:24px; --tight:14px; --group:56px; --sect:112px;
  --gutter:28px; --ease:cubic-bezier(0.16,1,0.3,1); --dur:220ms; --dur-fast:140ms;
  --mono:"Plex",ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
}}
@media (prefers-color-scheme: dark){{
  :root:not([data-t=light]){{
    --paper:#141413; --panel:#1b1b19; --ink:#f0efe8; --dim:#a09f96; --faint:#8f8e85;
    --line:#2b2b27; --accent:#6ea8ff; --build:#6ea8ff; --on-accent:#141413;
  }}
}}
:root[data-t=dark]{{
  --paper:#141413; --panel:#1b1b19; --ink:#f0efe8; --dim:#a09f96; --faint:#8f8e85;
  --line:#2b2b27; --accent:#6ea8ff; --build:#6ea8ff; --on-accent:#141413;
}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--mono);
  font-size:var(--step);line-height:var(--lead);font-weight:400;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:980px;margin:0 auto;padding:var(--group) var(--gutter) 160px}}
h1{{font-size:var(--step);font-weight:500;margin:0 0 var(--lead)}}
h2{{font-size:11px;font-weight:400;text-transform:uppercase;letter-spacing:.14em;
  margin:var(--sect) 0 var(--lead)}}
p{{margin:0 0 var(--lead);color:var(--dim);max-width:70ch}}
p.lede{{color:var(--ink)}}
b{{font-weight:500;color:var(--ink)}} i{{font-style:italic}}
code{{font:inherit;color:var(--ink)}}
table{{border-collapse:collapse;margin:0 0 var(--lead)}}
th,td{{text-align:left;padding:3px var(--lead) 3px 0;border-bottom:1px solid var(--line);
  color:var(--dim);vertical-align:baseline}}
th{{color:var(--faint);font-weight:400;font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;white-space:nowrap}}
td.num{{color:var(--ink);white-space:nowrap}} td.fine{{color:var(--faint)}}
.opt{{padding-top:var(--group);border-top:1px solid var(--line);margin-top:var(--group)}}
.opt:first-of-type{{border-top:0;margin-top:0}}
.ohd{{display:flex;gap:2ch;align-items:baseline;flex-wrap:wrap}}
.on{{color:var(--faint);flex:none}} .om{{font-weight:500;flex:none}}
.ow{{color:var(--dim);flex:1 1 38ch;min-width:30ch}}
.nt{{color:var(--dim);max-width:74ch;margin:var(--tight) 0 var(--lead)}}
.shots{{display:flex;gap:var(--lead)}}
.sh{{margin:0}}
.sh img{{display:block;width:420px;max-width:100%;height:auto;border:1px solid var(--line);
  image-rendering:auto}}
.sh figcaption{{color:var(--faint);font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;margin-top:var(--tight)}}
.note{{color:var(--faint)}}
</style>
</head>
<body>
<div class="wrap">

<h1>Practice room — two open findings from the research pass</h1>

<p class="lede">The instrument-standards research surfaced two things I reported but did not
change. Both are real, both are small, and both are taste calls — so here they are rendered,
magnified, on the actual page.</p>

<div class="sect" data-name="Frame inset">
<h2>Q1 · The frame inset — 28px or 3ch?</h2>

<p>The clearance between the case's hairline and its nearest ink is <b>28.00px</b> — the site's
<code>--gutter</code>, a spacing token. But in this face <code>1ch = 9.000px</code> exactly, so
28px is <b>3.111 characters</b>: the frame sits a third of a cell off the ladder every glyph on
the page is set on. MIL-STD-1472G states legend clearance in glyph widths ("not less than the
width of the letter H"); on that rule the inset would be <b>3ch = 27px</b> and the hairline would
BE a cell boundary.</p>

<p class="note">Both crops are the tuner's top-left corner at 4×, with the character cells drawn
from the content edge outward. Judge where the hairline falls against the cells: mid-cell, or on
a line. The difference is 1px per side — this is a question about whether the frame belongs to
the type's system, not about visible whitespace.</p>

{options(Q1)}

<div class="opt">
  <p class="note">Click an option's header to pick, or reply with a number
  (e.g. "Q1: 01").</p>
</div>
</div>

<div class="sect" data-name="Figure radii">
<h2>Q2 · The figure's radii — may the bob cross the tick?</h2>

<p>Inside the dial everything is placed by radius from the pivot, and the drawing already has a
five-rung ladder:</p>

<table>
<tr><th>mark</th><th>radius (viewBox units)</th><th>source</th></tr>
{rrows}
</table>

<p>Two rungs cross: the bob's outer edge (122) exceeds the tick's inner end (118), so <b>at the
moment of exact tune the disc covers the lower 4 units of the in-tune mark</b> — the one reading
the tick exists for. The same standard the transport fix came from says the pointer "shall extend
to, but not overlap, the shortest scale graduation marks."</p>

<p class="note">All four crops are the dial at 3×, needle live and centred (the in-tune pose),
which is where the overlap shows. The pendulum shares this drawing, so whatever wins applies to
both figures.</p>

{options(Q2)}

<div class="opt">
  <p class="note">Click an option's header to pick, or reply with a number
  (e.g. "Q2: 02").</p>
</div>
</div>

<h2>My read</h2>
<p><b>Q1: 02.</b> It is the same correction the site already made once for <code>--label</code> —
a number that was right about spacing and wrong about the grid it sits in — and it costs 1px.
<b>Q2: 02.</b> The arm yielding to the scale is what the convention says and what reads best at
3×: the tick keeps its full length, the bob keeps its size, and they touch instead of crossing.
03 makes the scale yield to the pointer, which is backwards; 04 costs the drawing its
silhouette.</p>
<p class="note">Nothing here is committed. The live page is untouched.</p>

</div>
{toggle}
{picker}
</body>
</html>
'''

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(HTML)
print(f'wrote {OUT}  ({len(HTML)/1024:.0f} kB)')
