#!/usr/bin/env python3
"""Build the /practice-room/ FIGURE RADII chooser — the re-render.

The first version of this question shipped crops that were too small and too
tightly cropped to tell the options apart; the user said so. The real difference
is 4 viewBox units = 3.44px at the size the dial actually renders, so a keyhole
crop at 3x hid the very thing being decided.

This sheet shows each option twice:
  · a DIAGRAM — inline SVG at 6x the real geometry, with the radial rungs drawn
    and labelled, so the arithmetic is visible
  · the REAL PAGE at true size — the whole width of the drawing, 2x device scale,
    needle live and centred, so you can judge whether 3.44px matters

  python3 scripts/build-radii-chooser.py
"""
import base64
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/local/home/shiauas/workplace/work/understand/'
                   'practice-room-radii/index.html')
SHOTS = json.load(open('/tmp/q2shots.json'))

FONTS = []
for name, weight, style in [('IBMPlexMono-Regular', 400, 'normal'),
                            ('IBMPlexMono-Medium', 500, 'normal'),
                            ('IBMPlexMono-Italic', 400, 'italic')]:
    b64 = base64.b64encode((REPO / 'public' / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    FONTS.append((weight, style, b64))

SCALE = 275 / 320          # the dial renders 275px wide for a 320-unit viewBox at 1440
PIVOT = 160                # viewBox y of the pivot; radii are measured up from it


def px(vb):
    return vb * SCALE


# ── the four options, as geometry ────────────────────────────────────────────
# each: (arm end y, bob cy, bob r, tick y1, tick y2)  — viewBox coordinates
GEOM = {
    '01': dict(arm=44, bob_cy=44, bob_r=6, tick_y1=26, tick_y2=42),
    '02': dict(arm=48, bob_cy=48, bob_r=6, tick_y1=26, tick_y2=42),
    '03': dict(arm=44, bob_cy=44, bob_r=6, tick_y1=26, tick_y2=38),
    '04': dict(arm=44, bob_cy=44, bob_r=2, tick_y1=26, tick_y2=42),
}


def radii(g):
    """the rungs, as radius from the pivot"""
    return dict(
        bob_outer=PIVOT - g['bob_cy'] + g['bob_r'],
        bob_centre=PIVOT - g['bob_cy'],
        tick_inner=PIVOT - g['tick_y2'],
        tick_outer=PIVOT - g['tick_y1'],
        arc=126,
    )


def gap(g):
    """clearance between the bob's outer edge and the tick's inner end, in vb.
    negative = they overlap."""
    r = radii(g)
    return r['tick_inner'] - r['bob_outer']


# ── the diagram: inline SVG, 6x, top of the dial only ────────────────────────
def diagram(key):
    g = GEOM[key]
    r = radii(g)
    Z = 6                       # zoom
    # a window on the viewBox around 12 o'clock: x 130..190, y 18..60
    vx, vy, vw, vh = 130, 16, 60, 48
    W, H = vw * Z, vh * Z
    ov = gap(g)
    over = ov < 0
    return f'''<svg class="dia" viewBox="{vx} {vy} {vw} {vh}" width="{W}" height="{H}"
     role="img" aria-label="the dial's radial rungs at {Z} times scale">
  <!-- the tick band, shaded, so its extent is legible -->
  <rect x="{vx}" y="{g['tick_y1']}" width="{vw}" height="{g['tick_y2'] - g['tick_y1']}"
        fill="var(--accent)" opacity=".07"/>
  <!-- rung guides, labelled by radius -->
  <line x1="{vx}" y1="{PIVOT - r['tick_outer']}" x2="{vx + vw}" y2="{PIVOT - r['tick_outer']}"
        stroke="var(--accent)" stroke-width=".25" opacity=".55"/>
  <line x1="{vx}" y1="{PIVOT - r['tick_inner']}" x2="{vx + vw}" y2="{PIVOT - r['tick_inner']}"
        stroke="var(--accent)" stroke-width=".25" opacity=".55"/>
  <line x1="{vx}" y1="{PIVOT - r['bob_outer']}" x2="{vx + vw}" y2="{PIVOT - r['bob_outer']}"
        stroke="var(--accent)" stroke-width=".25" opacity=".55" stroke-dasharray="1 1"/>
  <!-- rung ticks at the left edge instead of inline labels: at 6x, two rungs 4vb apart cannot
       both carry text without colliding, and the first render proved it (the labels overlapped
       into mush). The legend below names them. -->
  <line x1="{vx}" y1="{PIVOT - r['tick_outer']}" x2="{vx + 3}" y2="{PIVOT - r['tick_outer']}"
        stroke="var(--accent)" stroke-width=".5"/>
  <line x1="{vx}" y1="{PIVOT - r['tick_inner']}" x2="{vx + 3}" y2="{PIVOT - r['tick_inner']}"
        stroke="var(--accent)" stroke-width=".5"/>
  <!-- the arc -->
  <path d="M 34 160 A 126 126 0 0 1 286 160" fill="none" stroke="var(--faint)" stroke-width=".9"/>
  <!-- the tick -->
  <line x1="160" y1="{g['tick_y1']}" x2="160" y2="{g['tick_y2']}"
        stroke="var(--ink)" stroke-width="1.5"/>
  <!-- the arm and bob -->
  <line x1="160" y1="160" x2="160" y2="{g['arm']}" stroke="var(--ink)" stroke-width="1.5"/>
  <circle cx="160" cy="{g['bob_cy']}" r="{g['bob_r']}" fill="var(--ink)"/>
</svg>
<dl class="leg">
  <div><dt>tick outer</dt><dd>r {r['tick_outer']}</dd></div>
  <div><dt>tick inner — the scale</dt><dd>r {r['tick_inner']}</dd></div>
  <div><dt>bob edge (dashed)</dt><dd>r {r['bob_outer']}</dd></div>
</dl>
<p class="dcap">{'the bob crosses the scale by' if over else 'clearance'}
<b>{abs(ov)} viewBox units = {abs(px(ov)):.2f}px</b>{' — it hides '
 + str(round(abs(ov) / (r['tick_outer'] - r['tick_inner']) * 100)) + '% of the tick'
 if over else ' — pointer and scale meet without crossing'}</p>'''


OPTIONS = [
    dict(n='01', name='Current — the bob crosses the scale',
         why='The bob’s outer edge reaches r=122 while the tick’s inner end is r=118, so at '
             'exact tune the disc sits inside the scale mark and covers a quarter of it. '
             'MIL-STD-1472G §5.2.2.5.3b(5)(a): the pointer “shall extend to, but not overlap, '
             'the shortest scale graduation marks.”',
         cost='The one reading the tick exists for — dead centre, in tune — is the reading '
              'where the mark is most obscured.'),
    dict(n='02', name='Shorter arm — the bob stops at the scale',
         why='Arm and bob move in 4 units (cy 44 → 48) so the bob’s edge lands exactly on the '
             'tick’s inner end. The tick keeps its full 16 units; pointer and scale touch and '
             'never cross.',
         cost='The needle is 3.44px shorter against a 108px radius. Both figures change — the '
              'pendulum shares this drawing, and its bob is the weight, so it moves too.'),
    dict(n='03', name='Longer tick — the scale starts above the bob',
         why='The tick’s inner end retreats (y2 42 → 38) to clear the bob. The arm keeps its '
             'full reach.',
         cost='The tick loses a quarter of its length, 16 units to 12. The scale yields to the '
              'pointer, which is the wrong way round: the mark is the reference, the pointer is '
              'the thing being read against it.'),
    dict(n='04', name='Smaller bob — r 6 → 2',
         why='Shrink the bob until its edge clears the scale, leaving arm and tick alone.',
         cost='The bob stops reading as a bob. It is the pendulum’s weight and the needle’s '
              'head — the Wittner silhouette the drawing was chosen for — and at r=2 it is a '
              'dot on a line.'),
]

# the rung table, from the same geometry the diagrams use
RUNGS = [
    ('the arm’s end / bob centre', 116, 'line y2=44; circle cy=44'),
    ('tick inner — the scale', 118, 'line y2=42'),
    ('bob outer edge', 122, 'cy=44 + r=6'),
    ('the arc', 126, 'A 126 126'),
    ('tick outer', 134, 'y1=26'),
]
rrows = '\n'.join(
    f'<tr><td>{n}</td><td class="num">{r}</td><td class="num">{px(r):.1f}px</td>'
    f'<td class="fine">{src}</td></tr>' for n, r, src in RUNGS)

opts = '\n'.join(f'''
  <div class="opt">
    <div class="ohd">
      <span class="on">{o['n']}</span>
      <span class="om">{o['name']}</span>
      <span class="ow">{o['why']}</span>
    </div>
    <p class="nt"><b>Cost.</b> {o['cost']}</p>
    <div class="pair">
      <figure class="fg">
        {diagram(o['n'])}
        <figcaption>the geometry, 6×</figcaption>
      </figure>
      <figure class="fg">
        <img class="live" alt="the real dial at true size"
             src="data:image/png;base64,{SHOTS['live-' + o['n']]}">
        <figcaption>the real page, true size</figcaption>
      </figure>
    </div>
  </div>''' for o in OPTIONS)

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
<title>Practice room — may the bob cross the scale?</title>
<style>
{faces}
:root{{
  color-scheme: light dark;
  --paper:#f4f3ef; --panel:#ffffff; --ink:#141412; --dim:#5f5e57; --faint:#6e6d64;
  --line:#d5d4cd; --accent:#14306b; --on-accent:#ffffff;
  --step:15px; --lead:28px; --tight:14px; --group:56px; --sect:112px; --gutter:28px;
  --ease:cubic-bezier(0.16,1,0.3,1); --dur-fast:140ms;
  --mono:"Plex",ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
}}
@media (prefers-color-scheme: dark){{
  :root:not([data-t=light]){{
    --paper:#141413; --panel:#1b1b19; --ink:#f0efe8; --dim:#a09f96; --faint:#8f8e85;
    --line:#2b2b27; --accent:#6ea8ff; --on-accent:#141413;
  }}
}}
:root[data-t=dark]{{
  --paper:#141413; --panel:#1b1b19; --ink:#f0efe8; --dim:#a09f96; --faint:#8f8e85;
  --line:#2b2b27; --accent:#6ea8ff; --on-accent:#141413;
}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--mono);
  font-size:var(--step);line-height:var(--lead);font-weight:400;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1120px;margin:0 auto;padding:var(--group) var(--gutter) 160px}}
h1{{font-size:var(--step);font-weight:500;margin:0 0 var(--lead)}}
h2{{font-size:11px;font-weight:400;text-transform:uppercase;letter-spacing:.14em;
  margin:var(--sect) 0 var(--lead)}}
p{{margin:0 0 var(--lead);color:var(--dim);max-width:70ch}}
p.lede{{color:var(--ink)}}
b{{font-weight:500;color:var(--ink)}} i{{font-style:italic}}
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
.pair{{display:flex;gap:4ch;align-items:flex-start;flex-wrap:wrap}}
.fg{{margin:0}}
.dia{{display:block;background:var(--panel);border:1px solid var(--line)}}
.dia .dl{{font:400 2.4px/1 var(--mono);fill:var(--accent);opacity:.85}}
.leg{{margin:var(--tight) 0 0;display:flex;flex-direction:column;gap:0}}
.leg div{{display:flex;gap:1ch;align-items:baseline}}
.leg dt{{color:var(--faint);font-size:11px;text-transform:uppercase;letter-spacing:.14em;
  min-width:26ch}}
.leg dd{{margin:0;color:var(--ink)}}
.dcap{{color:var(--dim);margin:var(--tight) 0 0;max-width:44ch;font-size:var(--step)}}
.live{{display:block;width:275px;height:auto;image-rendering:-webkit-optimize-contrast;border:1px solid var(--line);background:var(--paper)}}
.fg figcaption{{color:var(--faint);font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;margin-top:var(--tight)}}
.note{{color:var(--faint)}}
</style>
</head>
<body>
<div class="wrap">

<h1>Practice room — may the bob cross the scale?</h1>

<p class="lede">Re-render. The first version of this question showed crops that were too small
and too tightly cropped to tell the four options apart — you were right, they did look the same.
The difference is <b>4 viewBox units = 3.44px</b> at the size the dial actually renders, so this
sheet shows each option twice: the geometry at 6× with the radii labelled, and the real dial at
true size beside it.</p>

<p><b>The question.</b> Inside the dial every mark is placed by radius from the pivot, and the
drawing has a five-rung ladder:</p>

<table>
<tr><th>rung</th><th>viewBox</th><th>rendered</th><th>source</th></tr>
{rrows}
</table>

<p>Two rungs cross. The bob's outer edge (122) is <i>outside</i> the tick's inner end (118), so
at exact tune — needle straight up, the reading the mark exists for — the disc covers the lower
<b>25%</b> of the in-tune tick. The standard behind the transport fix is explicit about this
case: the pointer "shall extend to, but not overlap, the shortest scale graduation marks"
(MIL-STD-1472G §5.2.2.5.3b(5)(a)), and Figure 30's note adds that pointers "ride against the
inner scale annulus just short of the markings."</p>

<p class="note">In every diagram the shaded band is the tick's extent and the dashed line is the
bob's outer edge; where the dashed line sits <i>inside</i> the band, they overlap. The
true-size renders are the live page with the needle live and centred at 2× device scale —
the same pose in all four, so the only thing changing is the geometry. Whatever wins applies to
BOTH figures: the metronome's pendulum is the same drawing.</p>

<div class="sect" data-name="Figure radii">
<h2>The four options</h2>
{opts}

<div class="opt">
  <p class="note">Click an option's header to pick it — the sheet copies your choice. Or reply
  with a number.</p>
</div>
</div>

<h2>My read</h2>
<p><b>02.</b> It is the only option where the scale keeps its authority: the tick stays full
length, the bob keeps its size, and the pointer stops where the mark begins — which is what the
convention actually says and what reads cleanest at true size. <b>03</b> shortens the reference
to accommodate the pointer, which is backwards. <b>04</b> fixes the geometry by deleting the
thing that makes the drawing a Wittner metronome rather than a line. <b>01</b> is defensible if
you think 3.44px of overlap is beneath notice — look at the true-size pair and decide.</p>
<p class="note">Nothing here is committed. The live page is untouched. (Q1 from the earlier
sheet — the 3ch frame inset — is shipped and live.)</p>

</div>
{toggle}
{picker}
</body>
</html>
'''

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(HTML)
print(f'wrote {OUT}  ({len(HTML)/1024:.0f} kB)')
for k in GEOM:
    g = GEOM[k]
    r = radii(g)
    print(f'  {k}: bob outer {r["bob_outer"]}  tick inner {r["tick_inner"]}  '
          f'gap {gap(g):+d} vb = {px(gap(g)):+.2f}px')
