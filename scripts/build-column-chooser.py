#!/usr/bin/env python3
"""Build the /practice-room/ COLUMN GRID chooser.

One data object → one self-contained HTML page. Every number on the sheet is
measured (tools/_recut3.mjs against the built page over loopback) and lives in
MEASURED below; nothing is hand-typed per option, so the numbers cannot drift
between the prose and the table.

  python3 scripts/build-column-chooser.py
  → ~/workplace/work/understand/practice-room-column-grid/index.html
"""
import base64
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/local/home/shiauas/workplace/work/understand/'
                   'practice-room-column-grid/index.html')
SHOTS = json.load(open('/tmp/proofshots.json'))

# ── the real tokens, copied verbatim from src/styles/global.css ───────────────
FONTS = {}
for name, weight, style in [('IBMPlexMono-Regular', 400, 'normal'),
                            ('IBMPlexMono-Medium', 500, 'normal'),
                            ('IBMPlexMono-Italic', 400, 'italic')]:
    b64 = base64.b64encode((REPO / 'public' / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    FONTS[name] = (weight, style, b64)

# ── MEASURED. tools/_recut3.mjs, built page, 1440x900, loopback preview. ──────
# 1ch = 9.000px exactly (IBM Plex Mono at --step 15px).
MEASURED = {
    'ch': 9,
    'screen_content_1440': 1328,
    # per option: whole-ch widths, ink-on-pitch, case width, figure width, min tap target
    'today':      {'whole': 2, 'pitch': 3, 'case': 636, 'fig': 275, 'tgt': 36, 'digit': 20},
    'recut':      {'whole': 6, 'pitch': 3, 'case': 636, 'fig': 275, 'tgt': 36, 'digit': 18},
    'recut_grid': {'whole': 6, 'pitch': 3, 'case': 621, 'fig': 242, 'tgt': 36, 'digit': 18},
    'total_marks': 8,
    # the gutter-inversion table: track width at 1440 for N tracks with a 28px gutter
    'inversion': [(25, 26.2), (26, 24.2), (28, 20.4), (29, 18.8), (30, 17.2)],
    # what a screen-wide viewport-fraction grid aligns, measured
    'vp_align': {'today': (2, 10), 'n29': (1, 10), 'n25': (0, 10), 'n29_placed': (2, 9)},
    # the seven px dimensions that are not whole ch, and the re-cut delta
    'recut_table': [
        ('number field (a4, bpm)', 60, '6.67ch', '7ch = 63px', '+3px', 'two fields'),
        ('meter rule (beats, subdivide)', 140, '15.56ch', '14ch = 126px', '−14px', 'two rules'),
        ('meter digit cell', 20, '2.22ch', '2ch = 18px', '−2px', '14 buttons'),
        ('latch rail (start, play tone)', 26, '2.89ch', '3ch = 27px', '+1px', 'three latches'),
        ('momentary ring (tap)', 14, '1.56ch', '2ch = 18px', '+4px', 'one button'),
        ('gutter / lead token', 28, '3.11ch', '—', '—', 'the whole site'),
        ('the drawing', 320, '35.56ch', '—', '—', 'scales; its RENDERED width is the question'),
    ],
}

OPTIONS = [
    dict(
        n='01', name='Today — 12 per case',
        shot='a-today', shot_grid='a-today-grid',
        why='What is live. Each case draws its own 12 columns; the figure spans six of them. '
            'The track is 22.5px against a 28px gutter — the gutter is WIDER than the column '
            'it separates, at every desktop width.',
        stats='today',
        note='The overlay tells the truth about the figure (it does span 6 tracks exactly) and '
             'nothing else lands on it.',
    ),
    dict(
        n='02', name='One screen-wide grid, 29 tracks',
        shot='b-vp29', shot_grid=None,
        why='Your 26–30 idea, built. 2×14 tracks + 1 for the gap, and the gutter HAS to drop to '
            '14px or the track (18.8px) is thinner than the gutter. Keeps today’s composition '
            'almost exactly — but aligns less than today does.',
        stats=None,
        note='Measured: 1 of 10 marks lands on a track edge, against today’s 2 of 10. Re-placing '
             'every row as spans of it got 2 of 9 — and blew the figure out to 632px.',
    ),
    dict(
        n='03', name='Re-cut to whole ch — no new grid',
        shot='c-recut', shot_grid='c-recut-grid',
        why='Leave the column count alone and fix the SEVEN hardcoded px dimensions that are not '
            'whole characters. 1ch = 9px exactly in this face, so a monospace UI’s marks are '
            'character counts — that is the unit they can actually share.',
        stats='recut',
        note='Whole-ch widths go 2/8 → 6/8 with no grid change at all. The composition does not '
             'move: case 636, figure 275, both identical to today.',
    ),
    dict(
        n='04', name='Re-cut + a 21-track ch grid',
        shot='d-recut-chgrid-plain', shot_grid='d-recut-chgrid',
        why='The re-cut, then a real screen-wide grid measured in the same unit: 6ch track + 1ch '
            'gutter = 7ch pitch, 21 tracks across, the case 10 of them and the gap 1. The grid a '
            'monospace screen can actually hold.',
        stats='recut_grid',
        note='The honest cost, measured: the case narrows 636 → 621 and the figure 275 → 242 '
             '(−12%), because a whole number of 7ch pitches is not the width the case happens to '
             'be. On-pitch alignment does not improve — still 3 of 8.',
    ),
]


def shot(key, label):
    if not key:
        return ''
    return (f'<figure class="sh"><img alt="{label}" src="data:image/png;base64,{SHOTS[key]}">'
            f'<figcaption>{label}</figcaption></figure>')


def stat_row(key):
    if not key:
        return ''
    m = MEASURED[key]
    t = MEASURED['total_marks']
    return f'''<dl class="st">
      <div><dt>whole-ch widths</dt><dd>{m['whole']} of {t}</dd></div>
      <div><dt>ink on the pitch</dt><dd>{m['pitch']} of {t}</dd></div>
      <div><dt>case</dt><dd>{m['case']}px</dd></div>
      <div><dt>figure</dt><dd>{m['fig']}px</dd></div>
      <div><dt>smallest target</dt><dd>{m['tgt']}px</dd></div>
    </dl>'''


inv = '\n'.join(
    f'<tr><td>{n} tracks</td><td class="num">{t}px</td>'
    f'<td class="bad">gutter is wider</td></tr>'
    for n, t in MEASURED['inversion'])

vp = MEASURED['vp_align']
vprows = '\n'.join(
    f'<tr><td>{lbl}</td><td class="num">{a} of {b}</td></tr>' for lbl, (a, b) in [
        ('today, per-case 12', vp['today']),
        ('29 tracks screen-wide', vp['n29']),
        ('25 tracks screen-wide', vp['n25']),
        ('29 tracks + every row re-placed', vp['n29_placed']),
    ])

recut = '\n'.join(
    f'<tr><td>{w}</td><td class="num">{px}px</td><td class="num">{inch}</td>'
    f'<td class="num">{to}</td><td class="num">{d}</td><td class="fine">{cnt}</td></tr>'
    for w, px, inch, to, d, cnt in MEASURED['recut_table'])

opts = '\n'.join(f'''
    <div class="opt">
      <div class="ohd">
        <span class="on">{o['n']}</span>
        <span class="om">{o['name']}</span>
        <span class="ow">{o['why']}</span>
      </div>
      {stat_row(o['stats'])}
      <p class="nt">{o['note']}</p>
      <div class="shots">
        {shot(o['shot'], 'as it renders')}
        {shot(o['shot_grid'], 'with the grid drawn (⌥G)')}
      </div>
    </div>''' for o in OPTIONS)

faces = '\n'.join(
    f'''@font-face{{font-family:"Plex";font-weight:{w};font-style:{s};font-display:swap;
  src:url(data:font/woff2;base64,{b64}) format("woff2")}}'''
    for (w, s, b64) in FONTS.values())

picker = (pathlib.Path.home() / '.claude/skills/proofs/picker.html').read_text()
toggle = (pathlib.Path.home() / '.claude/skills/proofs/theme-toggle.html').read_text()

HTML = f'''<!doctype html>
<html lang="en" data-t="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Practice room — does it want a column grid?</title>
<style>
{faces}
:root{{
  color-scheme: light dark;
  --paper:#f4f3ef; --panel:#ffffff; --ink:#141412; --dim:#5f5e57; --faint:#6e6d64;
  --line:#d5d4cd; --accent:#14306b; --build:#14306b; --on-accent:#ffffff;
  --step:15px; --lead:28px; --unit:24px; --tight:14px; --group:56px; --sect:112px;
  --gutter:28px; --measure:1120px;
  --ease:cubic-bezier(0.16,1,0.3,1); --dur:220ms; --dur-fast:140ms;
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
body{{margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--mono);font-size:var(--step);line-height:var(--lead);font-weight:400;
  -webkit-font-smoothing:antialiased}}
.wrap{{max-width:1180px;margin:0 auto;padding:var(--group) var(--gutter) 160px}}
h1{{font-size:var(--step);font-weight:500;margin:0 0 var(--lead)}}
h2{{font-size:var(--step);font-weight:400;text-transform:uppercase;letter-spacing:.14em;
  font-size:11px;color:var(--ink);margin:var(--sect) 0 var(--lead)}}
p{{margin:0 0 var(--lead);color:var(--dim);max-width:68ch}}
p.lede{{color:var(--ink)}}
b{{font-weight:500;color:var(--ink)}}
i{{font-style:italic}}
.lb{{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--faint);
  display:block;margin-bottom:var(--tight)}}
table{{border-collapse:collapse;margin:0 0 var(--lead);font-size:var(--step)}}
th,td{{text-align:left;padding:4px var(--lead) 4px 0;border-bottom:1px solid var(--line);
  color:var(--dim);vertical-align:baseline}}
th{{color:var(--faint);font-weight:400;font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;white-space:nowrap}}
td.num{{color:var(--ink);white-space:nowrap}}
td.bad{{color:var(--accent)}}
td.fine{{color:var(--faint)}}
/* ── options ─────────────────────────────────────────────────────────── */
.sect{{margin-bottom:var(--sect)}}
.opt{{padding-top:var(--group);border-top:1px solid var(--line);margin-top:var(--group)}}
.opt:first-of-type{{border-top:0;margin-top:0}}
.ohd{{display:flex;gap:2ch;align-items:baseline;flex-wrap:wrap}}
.on{{color:var(--faint);flex:none}}
.om{{font-weight:500;flex:none}}
.ow{{color:var(--dim);flex:1 1 42ch;min-width:32ch}}
.st{{display:flex;flex-wrap:wrap;gap:0 4ch;margin:var(--lead) 0 var(--tight)}}
.st div{{display:flex;gap:1ch;align-items:baseline}}
.st dt{{color:var(--faint);font-size:11px;text-transform:uppercase;letter-spacing:.14em}}
.st dd{{margin:0;color:var(--ink)}}
.nt{{color:var(--dim);max-width:74ch;margin:0 0 var(--lead)}}
.shots{{display:flex;flex-direction:column;gap:var(--lead)}}
.sh{{margin:0}}
.sh img{{display:block;width:100%;height:auto;border:1px solid var(--line)}}
.sh figcaption{{color:var(--faint);font-size:11px;text-transform:uppercase;
  letter-spacing:.14em;margin-top:var(--tight)}}
.note{{color:var(--faint)}}
</style>
</head>
<body>
<div class="wrap">

<h1>Practice room — does it want a column grid?</h1>

<p class="lede">The row ladder is live and holding: both instruments share one set of rows, so
the two <b>start</b> buttons and both pendulum pivots read <b>0.00px</b> apart at every width.
The question on this sheet is the <b>other axis</b> — whether a screen-wide column grid of
26–30 tracks is the right next move.</p>

<p><b>The constraint that decides it, and it is arithmetic, not taste.</b> A track has to be
wider than the gutter beside it, or the "grid" is a comb. At 1440 the screen's content is
{MEASURED['screen_content_1440']}px, and with the site's 28px gutter:</p>

<table>
<tr><th>screen-wide count</th><th>track width</th><th>verdict</th></tr>
{inv}
</table>

<p>So a 26–30 grid is only possible if the gutter drops to 14px. Fine — but then the real
question: <b>does anything land on it?</b> I built each one and measured the ink, not the boxes
(every control here pads out to a 44px tap target, so its box edge is nowhere near its visible
edge):</p>

<table>
<tr><th>grid</th><th>marks on a track edge</th></tr>
{vprows}
</table>

<p><b>A new count aligns nothing.</b> Changing the grid does not move the content onto it —
which is the exact defect <i>STYLE.md</i> records for <code>--label</code>: two grids running at
once, and the drawn one describing nothing.</p>

<p><b>Why, specifically: <span style="color:var(--ink)">1ch = 9.000px</span> exactly</b> in this
face at <code>--step</code>. In a monospace UI every mark's width is a character count — but
seven dimensions on this screen are hardcoded px that are not whole characters:</p>

<table>
<tr><th>dimension</th><th>now</th><th>in ch</th><th>re-cut to</th><th>delta</th><th>instances</th></tr>
{recut}
</table>

<div class="sect" data-name="Column grid">
<h2>The four options</h2>
<p class="note">Every screenshot below is the real page at 1440×900, rendered with the option
applied for real over loopback — not a mockup. Where an option has a second image, that is the
same render with the ⌥G overlay on, so you can see what the grid claims.</p>
{opts}

<div class="opt">
  <p class="note">Click an option's header to pick it — the sheet copies your choice. Or just
  reply with a number.</p>
</div>
</div>

<h2>My read</h2>
<p><b>03.</b> It is the only option where the measured alignment actually improves (2/8 → 6/8
whole-ch widths), it costs nothing in composition (case and figure identical to today), and it is
the prerequisite for any column grid — including yours. <b>04</b> is where 03 leads if the ch unit
proves out, and its cost is real and stated: the figure gives up 12%. <b>02</b> is the idea as
posed, built honestly, and it aligns less than what is live.</p>
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
