#!/usr/bin/env python3
"""Build the /practice-room/ alignment chooser — round 3, the parity system.

Rounds 1 and 2 asked "which column grid?" and "does placing everything on it help?".
The answers were no and no. This round starts from the question the user actually
posed — a frame datum plus a radial axis — and from a rule that turned out to be
falsifiable: for a CENTRED mark, landing on the character raster is a matter of
PARITY, not of any grid.

Every number in MEASURED came off the built page in headless Chrome over loopback
(tools/_parity*.mjs, tools/_rulecheck.mjs). One data object → one page.

  python3 scripts/build-parity-chooser.py
"""
import base64
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/local/home/shiauas/workplace/work/understand/'
                   'practice-room-parity/index.html')
SHOTS = json.load(open('/tmp/alignshots.json'))

FONTS = []
for name, weight, style in [('IBMPlexMono-Regular', 400, 'normal'),
                            ('IBMPlexMono-Medium', 500, 'normal'),
                            ('IBMPlexMono-Italic', 400, 'italic')]:
    b64 = base64.b64encode((REPO / 'public' / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    FONTS.append((weight, style, b64))

TOTAL = 11

# ── MEASURED ─────────────────────────────────────────────────────────────────
M = {
    # option: (on-cell starts, case px, gap px, figure px, verb offset px, min target px)
    'today':   dict(on=3,  case=636, gap=56, fig=275, verb=0, tgt=36),
    'columns': dict(on=1,  case=636, gap=56, fig=300, verb=0, tgt=36),
    'nocentre': dict(on=8, case=636, gap=56, fig=270, verb=-94.5, tgt=36),
    'parity':  dict(on=9,  case=632, gap=60, fig=270, verb=0, tgt=36),
}
# the parity system, per width — measured
WIDTHS = [
    (1440, 1328, 636, '64.44ch', '64ch', 632, 60, 9),
    (1280, 1168, 556, '55.56ch', '54ch', 542, 70, 9),
    (1100, 988,  466, '45.56ch', '44ch', 452, 70, 9),
    (1024, 912,  428, '41.33ch', '40ch', 416, 68, 9),
    (940,  828,  386, '36.67ch', '36ch', 380, 62, 9),
]
# the falsifiable test
PREDICTION = [
    ('64ch (even)', '30ch (even)', '17ch', 'on the raster', 'ON', True),
    ('64ch (even)', '29ch (odd)', '17.5ch', 'off by 0.50ch', 'off by 0.50', True),
]
# the seven dimensions, and what the parity system needs each to be
RECUT = [
    ('number field (a4, bpm)', '60px', '6.67ch', '8ch = 72px', 'even'),
    ('meter rule (beats, subdivide)', '140px', '15.56ch', '14ch = 126px', 'even'),
    ('meter digit cell', '20px', '2.22ch', '2ch = 18px', 'even'),
    ('latch rail (start, play tone)', '26px', '2.89ch', '3ch = 27px', 'odd — flush, so free'),
    ('momentary ring (tap)', '14px', '1.56ch', '2ch = 18px', 'even'),
    ('the figure', '275px', '30.56ch', '30ch = 270px', 'even — it is centred'),
    ('the readout', '257px', '28.56ch', '28ch = 252px', 'even — it is centred'),
]

OPTIONS = [
    dict(n='01', key='today', name='Today', shot='a-today', ovl='a-today-ovl',
         one='No system on this axis. Twelve columns are drawn per case; the figure spans six '
             'of them and everything else sits where its flex row leaves it.',
         cost='3 of 11 marks land on a character cell. The baseline.'),
    dict(n='02', key='columns', name='A column grid, everything placed on it',
         shot=None, ovl=None,
         one='Rounds 1 and 2: a screen-wide 26–30 track grid, then placing every mark on the '
             '12 columns via subgrid.',
         cost='WORSE than doing nothing — 1 of 11. A span edge sits 22.5px-and-a-fraction from '
              'the content edge, so it is never a character cell; and 26–30 tracks make the '
              'track narrower than the 28px gutter beside it, which is a comb, not a grid. '
              'Kept on the sheet because it is what "align everything to the grid" actually '
              'produces, measured.'),
    dict(n='03', key='nocentre', name='Delete centring', shot=None, ovl=None,
         one='Hang the figure at a whole-cell offset instead of centring it. The best number '
             'before this round.',
         cost='8 of 11 — but the transport ends up 94.5px off the centre of the dial it '
              'captions. It buys alignment by breaking a relationship the page decided '
              'deliberately.'),
    dict(n='04', key='parity', name='The parity system', shot='b-parity', ovl='b-parity-ovl',
         one='One module (2 characters = 18px). The case’s measure is an EVEN number of '
             'modules, so its centre axis falls ON a module line; every centred mark is an '
             'even number of modules wide, so centring lands on the raster by construction.',
         cost='9 of 11, centring intact, the verb still dead-centre under its figure, and it '
              'holds at every width. The two misses are the bpm group’s internal flex gap. '
              'The case gives up 4px (636 → 632) to make the measure even.'),
]


def shot(key, cap):
    if not key:
        return ''
    return (f'<figure class="sh"><img alt="{cap}" src="data:image/png;base64,{SHOTS[key]}">'
            f'<figcaption>{cap}</figcaption></figure>')


def stats(key):
    m = M[key]
    verb = 'under it' if m['verb'] == 0 else f"{m['verb']:+.1f}px off"
    return f'''<dl class="st">
      <div><dt>on a cell</dt><dd class="big">{m['on']} <span class="of">of {TOTAL}</span></dd></div>
      <div><dt>case</dt><dd>{m['case']}px</dd></div>
      <div><dt>gap</dt><dd>{m['gap']}px</dd></div>
      <div><dt>figure</dt><dd>{m['fig']}px</dd></div>
      <div><dt>verb vs figure</dt><dd>{verb}</dd></div>
      <div><dt>smallest target</dt><dd>{m['tgt']}px</dd></div>
    </dl>'''


opts = '\n'.join(f'''
  <div class="opt">
    <div class="ohd">
      <span class="on">{o['n']}</span>
      <span class="om">{o['name']}</span>
      <span class="ow">{o['one']}</span>
    </div>
    {stats(o['key'])}
    <p class="nt">{o['cost']}</p>
    <div class="shots">
      {shot(o['shot'], 'as it renders')}
      {shot(o['ovl'], 'with the module raster drawn')}
    </div>
  </div>''' for o in OPTIONS)

wrows = '\n'.join(
    f'<tr><td class="num">{w}</td><td class="num">{avail}</td><td class="num">{outer}</td>'
    f'<td class="num">{raw}</td><td class="num hit">{even}</td><td class="num">{case}</td>'
    f'<td class="num">{gap}</td><td class="num">{on} of 11</td></tr>'
    for w, avail, outer, raw, even, case, gap, on in WIDTHS)

prows = '\n'.join(
    f'<tr><td>{m}</td><td>{f}</td><td class="num">{s}</td><td>{r}</td>'
    f'<td class="{"hit" if ok else "miss"}">{"confirmed" if ok else "falsified"}</td></tr>'
    for m, f, s, r, _p, ok in PREDICTION)

rrows = '\n'.join(
    f'<tr><td>{w}</td><td class="num">{px}</td><td class="num">{inch}</td>'
    f'<td class="num">{to}</td><td class="fine">{why}</td></tr>'
    for w, px, inch, to, why in RECUT)

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
<title>Practice room — alignment by parity, not by grid</title>
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
td.num{{color:var(--ink);white-space:nowrap}}
td.hit{{color:var(--accent)}} td.miss{{color:var(--faint)}} td.fine{{color:var(--faint)}}
.rule{{border:0;border-top:1px solid var(--line);margin:var(--group) 0}}
.opt{{padding-top:var(--group);border-top:1px solid var(--line);margin-top:var(--group)}}
.opt:first-of-type{{border-top:0;margin-top:0}}
.ohd{{display:flex;gap:2ch;align-items:baseline;flex-wrap:wrap}}
.on{{color:var(--faint);flex:none}} .om{{font-weight:500;flex:none}}
.ow{{color:var(--dim);flex:1 1 40ch;min-width:30ch}}
.st{{display:flex;flex-wrap:wrap;gap:0 4ch;margin:var(--lead) 0 var(--tight)}}
.st div{{display:flex;gap:1ch;align-items:baseline}}
.st dt{{color:var(--faint);font-size:11px;text-transform:uppercase;letter-spacing:.14em}}
.st dd{{margin:0;color:var(--ink)}}
.st .big{{font-weight:500}} .st .of{{color:var(--faint);font-weight:400}}
.nt{{color:var(--dim);max-width:74ch;margin:0 0 var(--lead)}}
.shots{{display:flex;flex-direction:column;gap:var(--lead)}}
.sh{{margin:0}}
.sh img{{display:block;width:100%;height:auto;border:1px solid var(--line)}}
.sh figcaption{{color:var(--faint);font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;margin-top:var(--tight)}}
.note{{color:var(--faint)}}
.big-rule{{font-weight:500;color:var(--ink);max-width:66ch}}
</style>
</head>
<body>
<div class="wrap">

<h1>Practice room — alignment by parity, not by grid</h1>

<p class="lede">You said the grids were janky and unconvincing, and asked what real apps do —
whether the answer involves the <b>frame</b> as a datum and a <b>radial axis</b> the centred
thing radiates from. Both halves of that turned out to be right, and together they produce a
rule that is simpler than any grid on the last two sheets.</p>

<h2>What the research said</h2>

<p><b>Real apps do not share a divisor.</b> I measured every horizontal ink edge on six
production pages and looked for a common divisor: teenage.engineering 54% of edges on its best
candidate, iA Writer 75%, Linear 48%, Excalidraw 42%, Musicca 46%, Are.na 44%. Nothing above
noise. <b>There is no secret grid these apps are on</b> — which is the finding, because it means
the answer was never going to be a better column count.</p>

<p><b>What this page has instead is a typeface with a fixed cell.</b> IBM Plex Mono at 15px
gives <code>1ch = 9.000px</code> exactly. In a monospace UI every mark’s width is already a
character count — so the cell is the module the composition actually has, and a column grid is a
second, competing one. That is the <code>--label</code> failure STYLE.md records, and it is why
placing marks on the columns made alignment <i>worse</i>.</p>

<hr class="rule">

<h2>The rule, and it is falsifiable</h2>

<p class="big-rule">A centred mark of width <i>w</i> in a measure <i>m</i> starts at
(m − w) / 2. That is a whole number of cells if and only if <i>m</i> and <i>w</i> have the same
parity.</p>

<p>So centring is not the enemy of a raster — <b>odd/even mismatch</b> is. Give the case an even
measure and every centred mark an even width, and centring lands on the raster by construction,
with nothing hung off-centre. I tested it as a prediction rather than fitting it:</p>

<table>
<tr><th>measure</th><th>centred figure</th><th>starts at</th><th>result</th><th>prediction</th></tr>
{prows}
</table>

<p>Both directions confirmed, which is what makes this a system rather than a number that
happened to work. And it answers your two hypotheses exactly: <b>the frame is the datum</b> (every
measurement is taken from the case’s content edge, and the flush marks sit on it), and <b>the axis
is real</b> — the case’s centre line is where the figure and the readout and the verb all hang
from, and making the measure even is what puts that axis on the module.</p>

<h2>What each dimension has to become</h2>

<p>Seven hardcoded px dimensions are not whole cells. Flush marks only need to be whole; centred
marks need to be whole <i>and even</i>.</p>

<table>
<tr><th>dimension</th><th>now</th><th>in cells</th><th>becomes</th><th>why</th></tr>
{rrows}
</table>

<h2>It holds at every width</h2>

<p>The measure is derived, not chosen: take the case’s available width and round <i>down</i> to
the nearest even number of cells. The remainder becomes part of the gap between the instruments,
where it is paper on paper and reads as nothing.</p>

<table>
<tr><th>viewport</th><th>screen content</th><th>case outer</th><th>raw measure</th><th>even measure</th><th>case</th><th>gap</th><th>on a cell</th></tr>
{wrows}
</table>

<div class="sect" data-name="Alignment system">
<h2>The four options</h2>
<p class="note">01 and 04 carry real renders of the page at 1440×900 with the option applied over
loopback, plus the same render with the module raster drawn. 02 and 03 are the previous rounds’
best attempts, kept for their numbers — their renders are on the earlier sheets.</p>
{opts}

<div class="opt">
  <p class="note">Click an option’s header to pick it — the sheet copies your choice. Or reply
  with a number.</p>
</div>
</div>

<h2>My read</h2>
<p><b>04.</b> It is the only one of the four that can be stated in one sentence, every number is
derived (the module is 2 characters; the measure is the largest even count that fits), it holds
unchanged from 1440 to 940, and it keeps everything the page already decided — centring, the verb
under its figure, the 44px targets, the row ladder. It also beats the best previous attempt (9 of
11 against 8) while <i>not</i> paying that attempt’s price.</p>
<p><b>The honest costs.</b> The case loses 4px at 1440 so the measure can be even. Two marks
still miss — <code>bpm</code> and <code>tap</code>, both inside the metronome’s foot group, whose
internal flex gap is not a whole cell; that is fixable but I have not fixed it, so the sheet says
9 and not 11. And the gap between the instruments now varies a little by width (56 → 70px) because
it absorbs the rounding remainder.</p>
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
