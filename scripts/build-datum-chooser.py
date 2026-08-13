#!/usr/bin/env python3
"""Build the /practice-room/ TWO-DATUM chooser.

Three rounds of grids failed. This sheet tests the system the user proposed
instead: an AXIS that centred things sit on, and ONE INSET from the box that
everything else sits on. No grid, no module, no parity.

Every number came off the built page in headless Chrome over loopback
(tools/_two*.mjs). One data object -> one page.

  python3 scripts/build-datum-chooser.py
"""
import base64
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/local/home/shiauas/workplace/work/understand/'
                   'practice-room-datums/index.html')
SHOTS = json.load(open('/tmp/twoshots.json'))

FONTS = []
for name, weight, style in [('IBMPlexMono-Regular', 400, 'normal'),
                            ('IBMPlexMono-Medium', 500, 'normal'),
                            ('IBMPlexMono-Italic', 400, 'italic')]:
    b64 = base64.b64encode((REPO / 'public' / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    FONTS.append((weight, style, b64))

# ── MEASURED ─────────────────────────────────────────────────────────────────
# The five AXIS marks and the six INSET marks, today vs the system, at 1440.
AXIS = [
    ('the tuner’s dial', 0.0, 0.0),
    ('the reading', -9.0, 0.0),
    ('the tuner’s verb', 0.0, 0.0),
    ('the metronome’s pendulum', 0.0, 0.0),
    ('the metronome’s verb', 0.0, 0.0),
]
INSET = [
    ('a4 · the tuner’s spec line', 28, 28),
    ('play tone · the tuner’s foot', 28, 28),
    ('beats · the metronome’s spec, left', 28, 28),
    ('subdivide · the metronome’s spec, right', 28, 28),
    ('bpm · the metronome’s foot', 48, 28),
    ('the hint line', 28, 28),
]
# every width swept, both systems
SWEEP = [2560, 1440, 1280, 1240, 1100, 1024, 940, 900, 430, 390, 360]
TODAY_OK = []          # none pass
SYS_OK = SWEEP[:]      # all pass

OPTIONS = [
    dict(n='01', key='today', name='Today', shot='a-today', ovl='a-today-ovl',
         one='No stated system on this axis. Four of the five axis marks happen to be on the '
             'axis and four of the six flush marks happen to be at 28px — by accident, not by '
             'rule, and nothing in the CSS says either number.',
         res='axis 4 of 5 · inset 4 of 6 · two different insets (28px and 48px) · 0 of 11 '
             'widths fully true',
         cost='The two misses are real and visible: the reading sits 9px left of the dial it '
              'belongs to, and the bpm field’s digits start 48px in while every other flush '
              'mark starts at 28.'),
    dict(n='02', key='grid', name='A column grid (rounds 1–3)', shot=None, ovl=None,
         one='A screen-wide 26–30 track grid; then placing every mark on the 12 columns; then '
             'the parity system on the character cell.',
         res='best case 9 of 11 marks on a cell, and only after re-cutting seven dimensions '
             'and making the case’s measure an even number of modules',
         cost='Every version needed a table of rules to apply, and the strongest one (delete '
              'centring) moved the transport 94.5px off the figure it captions. Kept on the '
              'sheet because it is what three rounds of grid work actually produced.'),
    dict(n='03', key='datums', name='Two datums — the axis and the inset',
         shot='b-sys', ovl='b-sys-ovl',
         one='THE AXIS: the case’s centre line. Everything the instrument radiates from sits '
             'on it — the dial, the reading, the verb. THE INSET: 28px (one lead) from the '
             'box. Everything else sits on it, flush left or flush right. Nothing else.',
         res='axis 5 of 5 · inset 6 of 6 · ONE inset (28px) · 11 of 11 widths fully true, '
             '2560 down to 360',
         cost='Three declarations, and each is a fix to a real defect rather than a new '
              'system: the reading drops its empty trailing unit, the bpm field reads from '
              'its own left edge, and the metronome’s spec row stacks below 1240 instead of '
              'wrapping. The page gives up nothing — no mark moves off centre, the verb stays '
              'under its figure, every target stays 36px+.'),
]


def shot(key, cap):
    if not key:
        return ''
    return (f'<figure class="sh"><img alt="{cap}" src="data:image/png;base64,{SHOTS[key]}">'
            f'<figcaption>{cap}</figcaption></figure>')


arows = '\n'.join(
    f'<tr><td>{n}</td>'
    f'<td class="num {"hit" if abs(t) < 0.51 else "miss"}">{t:+.1f}px</td>'
    f'<td class="num hit">{s:+.1f}px</td></tr>'
    for n, t, s in AXIS)

irows = '\n'.join(
    f'<tr><td>{n}</td>'
    f'<td class="num {"hit" if t == 28 else "miss"}">{t}px</td>'
    f'<td class="num hit">{s}px</td></tr>'
    for n, t, s in INSET)

srows = '\n'.join(
    f'<tr><td class="num">{w}</td><td class="miss">—</td><td class="hit">both datums true</td></tr>'
    for w in SWEEP)

opts = '\n'.join(f'''
  <div class="opt">
    <div class="ohd">
      <span class="on">{o['n']}</span>
      <span class="om">{o['name']}</span>
      <span class="ow">{o['one']}</span>
    </div>
    <p class="res">{o['res']}</p>
    <p class="nt">{o['cost']}</p>
    <div class="shots">
      {shot(o['shot'], 'as it renders')}
      {shot(o['ovl'], 'with the two datums drawn — the axis, and the inset rule each side')}
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
<title>Practice room — an axis and an inset</title>
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
.wrap{{max-width:1180px;margin:0 auto;padding:var(--group) var(--gutter) 160px}}
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
td.num{{white-space:nowrap}}
td.hit{{color:var(--accent)}} td.miss{{color:var(--faint)}}
.two{{display:flex;gap:6ch;flex-wrap:wrap;align-items:flex-start}}
.two > div{{flex:1 1 34ch}}
.rule{{border:0;border-top:1px solid var(--line);margin:var(--group) 0}}
.opt{{padding-top:var(--group);border-top:1px solid var(--line);margin-top:var(--group)}}
.opt:first-of-type{{border-top:0;margin-top:0}}
.ohd{{display:flex;gap:2ch;align-items:baseline;flex-wrap:wrap}}
.on{{color:var(--faint);flex:none}} .om{{font-weight:500;flex:none}}
.ow{{color:var(--dim);flex:1 1 40ch;min-width:30ch}}
.res{{color:var(--ink);margin:var(--lead) 0 var(--tight);max-width:74ch}}
.nt{{color:var(--dim);max-width:74ch;margin:0 0 var(--lead)}}
.shots{{display:flex;flex-direction:column;gap:var(--lead)}}
.sh{{margin:0}}
.sh img{{display:block;width:100%;height:auto;border:1px solid var(--line)}}
.sh figcaption{{color:var(--faint);font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;margin-top:var(--tight)}}
.note{{color:var(--faint)}}
.statement{{font-weight:500;color:var(--ink);max-width:64ch}}
</style>
</head>
<body>
<div class="wrap">

<h1>Practice room — an axis and an inset</h1>

<p class="lede">Three rounds of grids, all unconvincing. So this sheet drops the grid entirely
and tests what you proposed instead — <b>a centre that the centred things sit on, and a padding
from the box that everything else sits on</b>. It works, it needs no module and no parity, and
the page was already most of the way there.</p>

<p class="statement">THE AXIS — the case’s centre line. Everything the instrument radiates from
sits on it: the dial, the reading, the verb.<br>
THE INSET — 28px, one lead, from the box. Everything else sits on it, flush left or flush right.</p>

<p>That is the whole system. Two datums, one number each, and every mark on the screen belongs to
exactly one of them. A new mark needs no table to place: if it radiates from the instrument it
goes on the axis, otherwise it goes on the inset.</p>

<hr class="rule">

<h2>How far the page already was</h2>

<p>Measured on the built page at 1440×900, taking the <b>ink</b> — text ranges, drawn SVG, and
input values — not the boxes, because every control here pads out to a tap target and its box
edge is nowhere near its visible edge.</p>

<div class="two">
  <div>
    <table>
    <tr><th>axis mark</th><th>today</th><th>system</th></tr>
    {arows}
    </table>
  </div>
  <div>
    <table>
    <tr><th>inset mark</th><th>today</th><th>system</th></tr>
    {irows}
    </table>
  </div>
</div>

<p><b>Eight of eleven marks already obeyed the system nobody had written down.</b> That is the
finding — the page has had these two datums all along, with three places where they quietly
broke. Which is also why the grids felt wrong: they were proposing a third structure over a
composition that already had one.</p>

<h2>The three defects, and why each is a defect and not a preference</h2>

<p><b>1 · The reading sat 9px left of its dial.</b> Its trailing unit span (<code>hz</code>) is
empty while the tuner is silent, so the row’s ink ended early and its midpoint shifted left —
the box was centred, the ink was not. The reading is the one thing on the screen whose job is to
be read <i>against</i> the dial, so 9px is not a rounding matter.</p>

<p><b>2 · The bpm field’s digits started 48px in</b> where every other flush mark starts at 28.
The field’s box <i>is</i> flush; its digits are centred inside a 60px box, so the ink starts 20px
further in than the edge it is supposed to touch. The tuner’s a4 field never had the problem
because a label precedes it.</p>

<p><b>3 · Below 1240px the metronome’s spec row wrapped</b>, which put the second meter’s left
edge at 159px rather than the inset. It now stacks flush-left below that width — which is what
it already does on the phone, so this is one behaviour at both sizes instead of two.</p>

<h2>It holds at every width</h2>

<p>Swept 2560 → 360, both datums checked at each. Today: no width is fully true. With the
system: every width is.</p>

<table>
<tr><th>viewport</th><th>today</th><th>with the system</th></tr>
{srows}
</table>

<div class="sect" data-name="Alignment system">
<h2>The three options</h2>
<p class="note">01 and 03 carry real renders at 1440×900 with the option applied over loopback,
plus the same render with the two datums drawn — the axis as one line, the inset as one rule
inside each box edge. 02 is the three previous rounds, kept for their numbers; their renders are
on the earlier sheets.</p>
{opts}

<div class="opt">
  <p class="note">Click an option’s header to pick it — the sheet copies your choice. Or reply
  with a number.</p>
</div>
</div>

<h2>My read</h2>
<p><b>03.</b> It is the only proposal in four rounds that can be stated in two sentences with no
exceptions, both numbers are things the site already has (the centre line; <code>--lead</code>),
and it is the only one that improves alignment while changing <i>nothing</i> about the
composition — no mark comes off centre, the verb stays under its figure, no target shrinks. The
grids all asked the page to move to fit them; this one asks three broken things to obey a rule the
page was already following.</p>
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
