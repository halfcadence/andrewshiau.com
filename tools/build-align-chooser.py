#!/usr/bin/env python3
"""Build the /practice-room/ ALIGNMENT chooser — round 2.

Round 1 asked "which column grid?" and the answer was "a grid you don't place
anything on is useless". This sheet answers the follow-up: for each candidate
grid, EVERY mark is actually snapped to it, and the sheet reports what that
bought and what it cost.

Every number comes from MEASURED below, read off the built page in headless
Chrome over loopback (tools/_snap*.mjs). One data object → one page, so the
prose and the tables cannot drift.

  python3 tools/build-align-chooser.py
"""
import base64
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/local/home/shiauas/workplace/work/understand/'
                   'practice-room-alignment/index.html')
SHOTS = json.load(open('/tmp/snapshots2.json'))

FONTS = []
for name, weight, style in [('IBMPlexMono-Regular', 400, 'normal'),
                            ('IBMPlexMono-Medium', 500, 'normal'),
                            ('IBMPlexMono-Italic', 400, 'italic')]:
    b64 = base64.b64encode((REPO / 'public' / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    FONTS.append((weight, style, b64))

TOTAL = 11  # marks measured per option

# ── MEASURED, tools/_snap.mjs / _snap2.mjs / _snap3.mjs / _snap4.mjs ─────────
# built page, 1440x900, loopback preview. 1ch = 9.000px exactly.
MEASURED = {
    'today':   dict(starts=3,  widths=2,  both=0, case=636, gap=56,  fig=275, verb=0,     tgt=36),
    'sub':     dict(starts=1,  widths=10, both=1, case=636, gap=56,  fig=270, verb=None,  tgt=36),
    'raster':  dict(starts=4,  widths=10, both=3, case=636, gap=56,  fig=270, verb=0,     tgt=36),
    'flush':   dict(starts=8,  widths=10, both=7, case=636, gap=56,  fig=270, verb=-94.5, tgt=36),
    'caption': dict(starts=6,  widths=10, both=5, case=576, gap=116, fig=270, verb=0,     tgt=36),
}

# every mark, and where its ink starts (ch from the case's content edge) per option.
# ON = lands on a whole character cell.
MARKS = ['a4', 'play tone', 'refnote', 'figure', 'readout', 'start (tuner)',
         'beats', 'subdivide', 'bpm', 'tap', 'start (metro)']
STARTS = {
    'today':   [(0, 1), (0, 1), (14.89, 0), (16.83, 0), (16.83, 0), (27.67, 0),
                (7, 1), (48.67, 0), (7.67, 0), (12.67, 0), (27.67, 0)],
    'sub':     [(50.44, 0), (45.22, 0), (60.22, 0), (30.89, 0), (43.31, 0), (10.94, 0),
                (7, 1), (50.22, 0), (53.22, 0), (58.22, 0), (10.94, 0)],
    'raster':  [(0, 1), (0, 1), (15, 1), (16.89, 0), (16.89, 0), (27.72, 0),
                (7, 1), (50.44, 0), (8.78, 0), (13.78, 0), (27.72, 0)],
    'flush':   [(0, 1), (0, 1), (15, 1), (17, 1), (17, 1), (17, 1),
                (7, 1), (50.44, 0), (8.78, 0), (13.78, 0), (17, 1)],
    'caption': [(0, 1), (0, 1), (15, 1), (17, 1), (17, 1), (27.5, 0),
                (7, 1), (49.78, 0), (8.78, 0), (13.78, 0), (27.5, 0)],
}

OPTIONS = [
    dict(n='01', key='today', name='Today — nothing placed',
         shot='t-today', ovl='t-today-ovl',
         why='What is live. Each case draws 12 columns and the figure spans six of them; '
             'everything else sits where its flex row leaves it.',
         cost='The grid describes one mark and nothing else. This is the baseline every '
              'other row is read against.'),
    dict(n='02', key='sub', name='Place everything on the 12 columns (subgrid)',
         shot='s-sub', ovl='s-sub-ovl',
         why='The obvious answer: make each control row a subgrid of the case and give '
             'every mark a column span. This is what "align everything to the grid" '
             'means if the grid is columns.',
         cost='WORSE than doing nothing — 1 of 11 against today’s 3. A mark placed in a '
              'span is positioned by the SPAN’s edge, and a 12-column span edge is '
              '22.5px-and-a-fraction from the content edge, never a character cell. It '
              'also stretched the figure to 300px until pinned.'),
    dict(n='03', key='raster', name='The character raster — re-cut, no tracks',
         shot='r-raster', ovl='r-raster-ovl',
         why='Delete the column idea. The grid a monospace screen actually has is the '
             'character cell: 1ch = 9px exactly. Re-cut the seven px dimensions to whole '
             'ch and let every mark keep its own flush-left / flush-right position.',
         cost='Whole-ch widths 2 → 10 of 11, and it beats the column version outright. '
              'The four still off are the CENTRED marks (figure, readout, both '
              'transports) — centring divides the leftover in half, and half of an odd '
              'leftover is never a whole cell.'),
    dict(n='04', key='flush', name='Raster + stop centring',
         shot='f-flush', ovl='f-flush-ovl',
         why='The centred marks are the only thing left off the raster, so stop centring '
             'them: the figure hangs from a whole-ch offset (17ch) instead of from the '
             'middle. Best measured alignment of anything tried.',
         cost='8 of 11 starts and 7 of 11 on BOTH axes — but the transport is no longer '
              'under the figure it drives. Its centre sits 94.5px left of the dial’s, so '
              'the bare verb stops reading as the figure’s caption. That was a decision '
              'on this page (transport-placement Q1/05), and this option overrides it.'),
    dict(n='05', key='caption', name='Raster + verb keeps its figure',
         shot='c-caption', ovl='c-caption-ovl',
         why='04, but the transport is re-centred on the FIGURE rather than the case — so '
             'the caption relationship survives and the figure still hangs on a whole ch.',
         cost='6 of 11 starts, so it gives back two of 04’s wins. It also forces the case '
              'to a whole 64ch (576px), which widens the gap between the instruments '
              '56 → 116px and shrinks each case by 60px.'),
]


def shot(key, cap):
    if not key:
        return ''
    return (f'<figure class="sh"><img alt="{cap}" src="data:image/png;base64,{SHOTS[key]}">'
            f'<figcaption>{cap}</figcaption></figure>')


def stats(key):
    m = MEASURED[key]
    verb = ('—' if m['verb'] is None
            else 'under it' if m['verb'] == 0
            else f"{m['verb']:+.1f}px off")
    return f'''<dl class="st">
      <div><dt>ink starts on a cell</dt><dd class="big">{m['starts']} <span class="of">of {TOTAL}</span></dd></div>
      <div><dt>whole-ch widths</dt><dd class="big">{m['widths']} <span class="of">of {TOTAL}</span></dd></div>
      <div><dt>both</dt><dd class="big">{m['both']} <span class="of">of {TOTAL}</span></dd></div>
      <div><dt>case</dt><dd>{m['case']}px</dd></div>
      <div><dt>gap</dt><dd>{m['gap']}px</dd></div>
      <div><dt>figure</dt><dd>{m['fig']}px</dd></div>
      <div><dt>verb vs figure</dt><dd>{verb}</dd></div>
    </dl>'''


def marktable(key):
    rows = []
    for name, (d, on) in zip(MARKS, STARTS[key]):
        # NOT class="on"/"off": the picker reads `.on` as "an option's number", so these
        # dots were being counted as options (27 in one question, and the pasted answer
        # collected them as picks). The skill's markup contract warns about exactly this.
        cls = 'hit' if on else 'miss'
        mark = '●' if on else '○'
        rows.append(f'<tr><td>{name}</td><td class="num">{d:g}ch</td>'
                    f'<td class="{cls}">{mark}</td></tr>')
    return ('<table class="mt"><tr><th>mark</th><th>ink starts</th><th>on a cell</th></tr>'
            + ''.join(rows) + '</table>')


opts = '\n'.join(f'''
  <div class="opt">
    <div class="ohd">
      <span class="on">{o['n']}</span>
      <span class="om">{o['name']}</span>
      <span class="ow">{o['why']}</span>
    </div>
    {stats(o['key'])}
    <p class="nt"><b>Cost.</b> {o['cost']}</p>
    <div class="cols">
      {marktable(o['key'])}
      <div class="shots">
        {shot(o['shot'], 'as it renders')}
        {shot(o['ovl'], 'with the grid drawn')}
      </div>
    </div>
  </div>''' for o in OPTIONS)

# the summary table — every option on one scale, so the geometry is the argument
best = max(m['both'] for m in MEASURED.values())
summary = '\n'.join(
    f'''<tr><td>{o['n']} {o['name']}</td>
    <td class="num">{MEASURED[o['key']]['starts']}</td>
    <td class="num">{MEASURED[o['key']]['widths']}</td>
    <td class="num">{MEASURED[o['key']]['both']}</td>
    <td class="bar"><span style="width:{MEASURED[o['key']]['both'] / TOTAL * 100:.1f}%"></span></td></tr>'''
    for o in OPTIONS)

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
<title>Practice room — is a column grid worth anything here?</title>
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
table{{border-collapse:collapse;margin:0 0 var(--lead)}}
th,td{{text-align:left;padding:3px var(--lead) 3px 0;border-bottom:1px solid var(--line);
  color:var(--dim);vertical-align:baseline}}
th{{color:var(--faint);font-weight:400;font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;white-space:nowrap}}
td.num{{color:var(--ink);white-space:nowrap;text-align:right}}
td.hit{{color:var(--accent)}} td.miss{{color:var(--line)}}
td.bar{{width:200px;padding-right:0}}
td.bar span{{display:block;height:9px;background:var(--accent)}}
.mt{{flex:0 0 30ch;font-size:var(--step);align-self:start}}
.mt td,.mt th{{padding:1px var(--tight) 1px 0}}
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
.cols{{display:flex;gap:4ch;align-items:flex-start;flex-wrap:wrap}}
.shots{{flex:1 1 640px;display:flex;flex-direction:column;gap:var(--lead);min-width:480px}}
.sh{{margin:0}}
.sh img{{display:block;width:100%;height:auto;border:1px solid var(--line)}}
.sh figcaption{{color:var(--faint);font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;margin-top:var(--tight)}}
.note{{color:var(--faint)}}
</style>
</head>
<body>
<div class="wrap">

<h1>Practice room — is a column grid worth anything here?</h1>

<p class="lede">Last sheet compared column counts. Your call on it was the right one: <i>if the
grid isn’t helpful for alignment it’s kinda useless.</i> So this sheet does the work — for each
candidate, <b>every mark on the screen is actually snapped to it</b>, and the measured result is
reported beside what it cost.</p>

<p><b>How the measuring works, because it decides the answer.</b> Each control here pads out to a
44px tap target with matching negative margins, so its <i>box</i> edge is nowhere near its
<i>visible</i> edge. Every number below is the <b>ink</b> — text ranges plus drawn SVG — measured
from the case’s own content edge, on the built page at 1440×900. Two things are counted per mark:
whether its ink <b>starts</b> on a whole character cell (1ch = 9.000px exactly in this face), and
whether its <b>width</b> is a whole number of cells. Eleven marks per option.</p>

<table>
<tr><th>option</th><th>starts on a cell</th><th>whole widths</th><th>both</th><th>both, drawn</th></tr>
{summary}
</table>

<p><b>The finding, and it is the opposite of what a grid promises.</b> Placing every mark on the
12 columns (02) made alignment <b>worse than doing nothing</b> — 1 of 11 against today’s 3. A
mark placed in a span is positioned by the span’s edge, and a 12-column span edge sits
22.5px-and-a-fraction from the content edge: never a character cell. The column grid and the
typeface are two grids, and in a monospace UI the typeface wins.</p>

<p>What does work is the <b>character cell</b> — no tracks at all (03), and then removing the one
thing that can’t land on it: centring (04). Centring divides the leftover in half, and half of an
odd leftover is never a whole cell. That is where the 8-of-11 comes from.</p>

<div class="sect" data-name="Alignment">
<h2>The five, each with everything actually snapped</h2>
<p class="note">Every screenshot is the real page at 1440×900 with the option applied for real
over loopback. The second image in each pair draws the grid that option aligns to — 12 columns
for 01 and 02, the 9px character raster for 03–05. <b>The raster is deliberately unusable as a
visual guide</b> at this scale (a hairline every 9px reads as hatching); it is drawn so you can
see what the marks are landing on, not as a proposal for the ⌥G overlay.</p>
{opts}

<div class="opt">
  <p class="note">Click an option’s header to pick it — the sheet copies your choice. Or reply
  with a number.</p>
</div>
</div>

<h2>My read</h2>
<p><b>03.</b> It gets 10 of 11 widths and 4 of 11 starts for no compositional cost at all — the
case, the gap and the figure are within a pixel of what is live, and nothing about the page’s
existing decisions is overridden. <b>04</b> is the best alignment number on the sheet and I would
not ship it: it buys 4 more marks by breaking the transport’s relationship to the figure it
drives, which is a decision this page already made deliberately, and 94.5px is not a subtle
break. <b>05</b> is the honest compromise and its price is a 60px-narrower case and a gap that
doubles.</p>
<p><b>And on the original question: no, the column grid is not worth it here.</b> 02 is the
strongest version of it, built and measured, and it is the worst row in the table.</p>
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
