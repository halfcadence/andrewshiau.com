#!/usr/bin/env python3
"""Build the /practice-room/ TRANSPORT chooser.

Two questions on one sheet:
  Q1 — the control's treatment. 12 candidates, each a REAL operable control
       (click it: the state changes exactly as the page's would), in the page's
       own tokens and typeface.
  Q2 — placement: does the tuner's transport belong under the figure as a
       caption, or in line with the cents/note readout?

Q2's answer changes how Q1's options read, so the sheet is REACTIVE per the
skill's rule for element-scale questions: every Q1 option renders inside the
CURRENT Q2 placement, and picking a placement re-renders all 12.

  python3 scripts/build-transport-chooser.py
"""
import base64
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/local/home/shiauas/workplace/work/understand/'
                   'practice-room-transport/index.html')

FONTS = []
for name, weight, style in [('IBMPlexMono-Regular', 400, 'normal'),
                            ('IBMPlexMono-Medium', 500, 'normal'),
                            ('IBMPlexMono-Italic', 400, 'italic')]:
    b64 = base64.b64encode((REPO / 'public' / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    FONTS.append((weight, style, b64))

# ── the twelve treatments ────────────────────────────────────────────────────
# Each is (id, name, why, cost, markup). The markup is the BUTTON's innards; the
# sheet wraps it in the page's real .tbtn and wires one shared toggle that only
# flips aria-pressed — every treatment's appearance comes from ITS OWN css, so no
# handler branches on which option it is.
OPTIONS = [
    dict(
        n='01', key='now', name='Current — track then word',
        why='What is live. A 26px two-pocket track, then a 9px gap, then the word. The word '
            'sits on the case’s centre axis, which is what the last pass fixed — but the '
            'track was taken out of flow to get it there, so it now hangs 17.5px to the LEFT '
            'of everything and sits below the word’s baseline.',
        cost='The control as a whole reads 17.50px left of centre. Two marks, two alignments, '
             'neither agreeing — this is the “not aligned and ugly”.'),
    dict(
        n='02', key='trackonly', name='The track alone — no word',
        why='Delete the label. The two-pocket track IS the site’s toggle grammar (chooser '
            'metrotuner-control-taxonomy 03): one disc, two resting places, latched = the far '
            'pocket in accent. A dial with a running needle needs no word to say it is running.',
        cost='Nothing on screen names the control. First-time readers get no verb, and the '
             'accessible name has to carry the whole meaning.'),
    dict(
        n='03', key='wordonly', name='The word alone — no track',
        why='The opposite deletion: one word, centred, swapping start/stop. Nothing but type — '
            'which is what this site is made of, and the width is already reserved so the swap '
            'does not reflow.',
        cost='Loses the state-at-a-distance the disc gives. The only signal that it is running '
             'is one word changing, in the same colour as everything else.'),
    dict(
        n='04', key='playpause', name='Play / pause glyph',
        why='The universal transport pair, drawn to the type’s cap height: a triangle for '
            'stopped, two bars for running. No word, no track.',
        cost='It is the one idiom on this page borrowed from software rather than from '
             'instruments. A tuner is not a tape deck — and the page has no other glyph '
             'buttons, so it would be an idiom of one.'),
    dict(
        n='05', key='ramsdot', name='Rams — the snow-white dot',
        why='Braun’s switch reduced to its essential: a small square field with a dot that '
            'moves and takes the accent when on. Nothing but the mark that changes.',
        cost='Adds a filled surface, and the site’s rule is “structure is rules and '
             'whitespace, not boxes”. The field is a box.'),
    dict(
        n='06', key='ramsbar', name='Rams — the rocker bar',
        why='The other Braun switch: a hairline rocker that tips. Two states as two positions '
            'of one bar, no fill at all — closer to the site’s hairline vocabulary than the '
            'dot-in-a-field is.',
        cost='A tipping bar is a physical metaphor nothing else here uses; the disc-on-a-track '
             'is the established one.'),
    dict(
        n='07', key='wordtrack', name='Word then track — the track follows',
        why='Today’s two marks in the other order, both IN flow. The word leads (so the reader '
            'gets the verb first) and the disc trails as its state. The pair centres as one '
            'object, so nothing hangs off-axis.',
        cost='The word’s own centre is then ~17px left of the case axis, so it no longer sits '
             'exactly under the needle — the thing the last pass was fixing.'),
    dict(
        n='08', key='stacked', name='Word over track',
        why='Two rows: the word on the transport line, the track centred under it. Both marks '
            'on the axis, because each is centred independently.',
        cost='Costs a row. The ladder has a fixed 28px transport row, so the track has to '
             'borrow from the slack below it — and the control stops being one line.'),
    dict(
        n='09', key='bracket', name='The word in brackets',
        why='[ start ] — the type carries the affordance. Brackets are the one non-alphabetic '
            'mark a monospace face renders as furniture rather than ornament, and they say '
            '“this is pressable” without a box or a glyph.',
        cost='Invents a new idiom for one control. If brackets mean “button” they should mean '
             'it everywhere, and nothing else on the page uses them.'),
    dict(
        n='10', key='underline', name='The word, ruled',
        why='One word with a hairline under it — the site’s own rule vocabulary applied to a '
            'control: the rule thickens to ink when running.',
        cost='This is the link idiom, and the track-grammar chooser explicitly killed it — '
             '“buttons no longer borrow the link idiom”. Reviving it here reopens that.'),
    dict(
        n='11', key='disc', name='The disc alone',
        why='One filled circle that takes the accent when running, no track and no word. The '
            'smallest possible mark, and it matches the momentary’s ring — the page already '
            'uses a lone circle for “tap”.',
        cost='Collides with that: a lone circle is the page’s MOMENTARY grammar (a disc with '
             'nowhere to travel can only be pressed). Using it for a latch breaks the one '
             'system the controls have.'),
    dict(
        n='12', key='readout', name='The verb in the reading’s own line',
        why='No separate control: the word takes the readout’s left slot, where the note name '
            'appears once running. The transport becomes the reading’s zero state — “start” '
            'is literally replaced by “A4”.',
        cost='The strongest idea and the biggest change: the control disappears when the '
             'instrument runs, so stopping it means clicking the note name. Also only works '
             'for the tuner — the metronome has no readout.'),
]

# ── the two placements ──────────────────────────────────────────────────────
PLACE = [
    dict(n='01', key='cap', name='Under the figure — a caption',
         why='What is live. The transport is the dial’s caption: its own row on the ladder, '
             'directly under the drawing it drives, one lead below the reading.',
         cost='Costs a row of the ladder, and puts two things (reading, then verb) in the '
              'gap between the dial and the foot.'),
    dict(n='02', key='inline', name='In line with the reading',
         why='Your instinct: the verb sits in the readout row itself, sharing the line with '
             'the cents and the note name. One row instead of two, and the control is beside '
             'the numbers it turns on.',
         cost='The readout row is flush-spread (note left, cents right, Hz trailing), so the '
              'verb has to take a slot in that spread rather than the axis. And it applies to '
              'the tuner only — the metronome has no reading, so the two instruments would '
              'stop being one drawing in two states.'),
]


def render(o):
    """the button's innards for one treatment — real markup, real classes"""
    k = o['key']
    TRACK = ('<svg class="tk" width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">'
             '<line class="run" x1="4" y1="6" x2="22" y2="6"/>'
             '<circle class="pk pk0" cx="4" cy="6" r="2.4"/>'
             '<circle class="pk pk1" cx="22" cy="6" r="2.4"/>'
             '<circle class="disc" cy="6" r="3.2"/></svg>')
    WORD = '<span class="w fixw" style="--w:5ch">start</span>'
    if k == 'now':
        return f'<button type="button" class="tbtn latch t-now" aria-pressed="false">{TRACK}{WORD}</button>'
    if k == 'trackonly':
        return (f'<button type="button" class="tbtn latch t-trackonly" aria-pressed="false"'
                f' aria-label="start the tuner">{TRACK}</button>')
    if k == 'wordonly':
        return f'<button type="button" class="tbtn latch t-wordonly" aria-pressed="false">{WORD}</button>'
    if k == 'playpause':
        return (f'<button type="button" class="tbtn latch t-playpause" aria-pressed="false"'
                f' aria-label="start the tuner">'
                f'<svg class="gl" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">'
                f'<polygon class="pl" points="1,0.5 10,5.5 1,10.5"/>'
                f'<g class="pz"><rect x="1" y="0.5" width="3" height="10"/>'
                f'<rect x="7" y="0.5" width="3" height="10"/></g></svg></button>')
    if k == 'ramsdot':
        return (f'<button type="button" class="tbtn latch t-ramsdot" aria-pressed="false"'
                f' aria-label="start the tuner">'
                f'<svg class="rd" width="22" height="11" viewBox="0 0 22 11" aria-hidden="true">'
                f'<rect class="fld" x="0.5" y="0.5" width="21" height="10"/>'
                f'<circle class="dt" cx="5.5" cy="5.5" r="2.2"/></svg></button>')
    if k == 'ramsbar':
        return (f'<button type="button" class="tbtn latch t-ramsbar" aria-pressed="false"'
                f' aria-label="start the tuner">'
                f'<svg class="rb" width="24" height="11" viewBox="0 0 24 11" aria-hidden="true">'
                f'<line class="piv" x1="12" y1="1" x2="12" y2="10"/>'
                f'<line class="bar" x1="2" y1="4" x2="22" y2="7"/></svg></button>')
    if k == 'wordtrack':
        return f'<button type="button" class="tbtn latch t-wordtrack" aria-pressed="false">{WORD}{TRACK}</button>'
    if k == 'stacked':
        return (f'<button type="button" class="tbtn latch t-stacked" aria-pressed="false">'
                f'{WORD}{TRACK}</button>')
    if k == 'bracket':
        return (f'<button type="button" class="tbtn latch t-bracket" aria-pressed="false">'
                f'<span class="br">[</span>{WORD}<span class="br">]</span></button>')
    if k == 'underline':
        return f'<button type="button" class="tbtn latch t-underline" aria-pressed="false">{WORD}</button>'
    if k == 'disc':
        return (f'<button type="button" class="tbtn latch t-disc" aria-pressed="false"'
                f' aria-label="start the tuner">'
                f'<svg class="dsc" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">'
                f'<circle cx="5.5" cy="5.5" r="4"/></svg></button>')
    if k == 'readout':
        return f'<button type="button" class="tbtn latch t-readout" aria-pressed="false">{WORD}</button>'
    raise SystemExit(f'no render for {k}')


def figure(o):
    """one option: the real dial + reading + this treatment, in the current placement"""
    ctl = render(o)
    return f'''<div class="mini" data-k="{o['key']}">
  <svg class="dial" viewBox="0 0 320 184" aria-hidden="true">
    <path d="M 34 160 A 126 126 0 0 1 286 160" fill="none" stroke="var(--faint)" stroke-width="1.5"/>
    <line x1="160" y1="26" x2="160" y2="42" stroke="var(--ink)" stroke-width="1.5"/>
    <g class="ndl"><line x1="160" y1="160" x2="160" y2="48" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="160" cy="48" r="6" fill="currentColor"/></g>
    <circle cx="160" cy="160" r="2.5" fill="var(--ink)"/>
  </svg>
  <div class="rd">
    <span class="mrn nt">—</span><span class="ends"></span>
    <span class="mrc ct">–</span><span class="mrh hz"></span>
    <span class="slot">{ctl}</span>
  </div>
  <div class="cap">{ctl}</div>
</div>'''


opts = '\n'.join(f'''
  <div class="opt">
    <div class="ohd">
      <span class="on">{o['n']}</span>
      <span class="om">{o['name']}</span>
      <span class="ow">{o['why']}</span>
    </div>
    <p class="nt2"><b>Cost.</b> {o['cost']}</p>
    {figure(o)}
  </div>''' for o in OPTIONS)

places = '\n'.join(f'''
  <div class="opt">
    <div class="ohd">
      <span class="on">{o['n']}</span>
      <span class="om">{o['name']}</span>
      <span class="ow">{o['why']}</span>
    </div>
    <p class="nt2"><b>Cost.</b> {o['cost']}</p>
  </div>''' for o in PLACE)

faces = '\n'.join(
    f'''@font-face{{font-family:"Plex";font-weight:{w};font-style:{s};font-display:swap;
  src:url(data:font/woff2;base64,{b64}) format("woff2")}}''' for w, s, b64 in FONTS)

picker = (pathlib.Path.home() / '.claude/skills/proofs/picker.html').read_text()
toggle = (pathlib.Path.home() / '.claude/skills/proofs/theme-toggle.html').read_text()

HTML = f'''<!doctype html>
<html lang="en" data-t="" data-place="cap">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Practice room — the start/stop control</title>
<style>
{faces}
:root{{
  color-scheme: light dark;
  --paper:#f4f3ef; --panel:#ffffff; --ink:#141412; --dim:#5f5e57; --faint:#6e6d64;
  --line:#d5d4cd; --accent:#14306b; --on-accent:#ffffff;
  --step:15px; --lead:28px; --tight:14px; --group:56px; --sect:112px; --gutter:28px;
  --mt-inset:3ch;
  --ease:cubic-bezier(0.16,1,0.3,1); --dur:220ms; --dur-fast:140ms;
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
.wrap{{max-width:1180px;margin:0 auto;padding:var(--group) var(--gutter) 200px}}
h1{{font-size:var(--step);font-weight:500;margin:0 0 var(--lead)}}
h2{{font-size:11px;font-weight:400;text-transform:uppercase;letter-spacing:.14em;
  margin:var(--sect) 0 var(--lead)}}
p{{margin:0 0 var(--lead);color:var(--dim);max-width:70ch}}
p.lede{{color:var(--ink)}}
b{{font-weight:500;color:var(--ink)}} i{{font-style:italic}}
code{{font:inherit;color:var(--ink)}}
.note{{color:var(--faint)}}

/* ── the options grid: 12 minis, side by side, so they compare ────────────── */
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));
  gap:var(--group) 4ch}}
.opt{{padding-top:var(--lead);border-top:1px solid var(--line)}}
.ohd{{display:flex;gap:1.5ch;align-items:baseline;flex-wrap:wrap}}
.on{{color:var(--faint);flex:none}} .om{{font-weight:500;flex:none}}
.ow{{color:var(--dim);flex:1 1 100%;margin-top:2px}}
.nt2{{color:var(--dim);margin:var(--tight) 0;font-size:var(--step)}}

/* ── the mini instrument: the real dial, reading, and control ─────────────── */
.mini{{background:var(--panel);border:1px solid var(--line);
  padding:var(--lead) var(--mt-inset);margin-top:var(--tight)}}
.dial{{display:block;width:100%;height:auto;color:var(--line)}}
.mini .ndl{{color:var(--line)}}
.mini[data-on] .ndl{{color:var(--ink)}}
/* the reading row — the page's own flush spread */
.rd{{display:flex;align-items:baseline;gap:2ch;margin-top:var(--lead)}}
.rd .ends{{flex:1}}
.mrn{{color:var(--ink);padding:0 .5ch;margin-left:-.5ch}}
.mrc{{color:var(--ink)}} .mrh{{color:var(--faint)}}
.mini[data-on] .nt{{background:var(--ink);color:var(--paper)}}
/* the caption row */
.cap{{display:flex;justify-content:center;margin-top:var(--lead);min-height:var(--lead)}}
/* THE PLACEMENT SWITCH: which slot holds the control. One attribute on <html>,
   CSS decides — no per-option branching. */
.slot{{display:none}}
html[data-place=inline] .slot{{display:inline-flex;flex:none}}
html[data-place=inline] .cap{{display:none}}
html[data-place=cap] .slot{{display:none}}
/* in the inline placement the reading row gains a fourth member, so the trailing Hz reading
   stops being the last thing on the line — the verb is. Keeps the flush spread honest. */
html[data-place=inline] .rd{{gap:1.5ch}}

/* ── THE PAGE'S REAL CONTROL STYLES, copied verbatim ──────────────────────── */
.tbtn{{font:inherit;color:var(--ink);background:transparent;border:0;padding:0;
  border-radius:0;min-height:44px;cursor:pointer;
  transition:color var(--dur-fast) var(--ease);
  display:inline-flex;align-items:baseline;gap:1ch}}
.tbtn:hover{{color:var(--accent)}}
.tbtn:focus-visible{{outline:1px solid var(--accent);outline-offset:2px}}
.tbtn .tk{{flex:none;display:block;overflow:visible;transform:translateY(2px)}}
.latch .tk .run{{stroke:var(--line);stroke-width:1}}
.latch .tk .pk{{fill:none;stroke:var(--faint);stroke-width:1.2}}
.latch .tk .disc{{fill:var(--ink);cx:4px;
  transition:transform var(--dur) var(--ease),fill var(--dur) var(--ease)}}
.latch[aria-pressed="true"] .tk .disc{{fill:var(--accent);transform:translateX(18px)}}
.tbtn.fixw .w, .tbtn .w.fixw{{display:inline-block;min-width:var(--w);text-align:left}}

/* ── 01 current: the track out of flow, left of the word ──────────────────── */
.t-now{{position:relative}}
.t-now .tk{{position:absolute;right:100%;margin-right:1ch;top:50%;
  transform:translateY(-50%) translateY(2px)}}

/* ── 02 track only ───────────────────────────────────────────────────────── */
.t-trackonly .tk{{transform:translateY(2px)}}

/* ── 03 word only ────────────────────────────────────────────────────────── */
/* nothing to add — the .tbtn base is already one centred word */

/* ── 04 play / pause ─────────────────────────────────────────────────────── */
.t-playpause .gl{{flex:none;display:block;transform:translateY(1px);fill:var(--ink)}}
.t-playpause .pz{{display:none}}
.t-playpause[aria-pressed="true"] .pl{{display:none}}
.t-playpause[aria-pressed="true"] .pz{{display:block;fill:var(--accent)}}

/* ── 05 Rams dot in a field ──────────────────────────────────────────────── */
.t-ramsdot .rd{{flex:none;display:block;transform:translateY(1px)}}
.t-ramsdot .fld{{fill:none;stroke:var(--line);stroke-width:1}}
.t-ramsdot .dt{{fill:var(--ink);transition:transform var(--dur) var(--ease),
  fill var(--dur) var(--ease)}}
.t-ramsdot[aria-pressed="true"] .dt{{fill:var(--accent);transform:translateX(11px)}}

/* ── 06 Rams rocker bar ──────────────────────────────────────────────────── */
.t-ramsbar .rb{{flex:none;display:block;transform:translateY(1px);overflow:visible}}
.t-ramsbar .piv{{stroke:var(--line);stroke-width:1}}
.t-ramsbar .bar{{stroke:var(--ink);stroke-width:1.6;
  transition:transform var(--dur) var(--ease),stroke var(--dur) var(--ease)}}
.t-ramsbar[aria-pressed="true"] .bar{{stroke:var(--accent);
  transform:translateY(3px) scaleY(-1);transform-origin:12px 5.5px}}

/* ── 07 word then track (both in flow) ───────────────────────────────────── */
/* base .tbtn order is already word→track from the markup */

/* ── 08 word over track ──────────────────────────────────────────────────── */
.t-stacked{{flex-direction:column;align-items:center;gap:2px}}
.t-stacked .w{{text-align:center;min-width:0}}

/* ── 09 brackets ─────────────────────────────────────────────────────────── */
.t-bracket{{gap:.5ch}}
.t-bracket .br{{color:var(--faint)}}
.t-bracket[aria-pressed="true"] .br{{color:var(--accent)}}

/* ── 10 ruled word ───────────────────────────────────────────────────────── */
.t-underline .w{{border-bottom:1px solid var(--line);padding-bottom:2px}}
.t-underline[aria-pressed="true"] .w{{border-bottom-color:var(--accent);
  border-bottom-width:1.5px}}

/* ── 11 the disc alone ───────────────────────────────────────────────────── */
/* 11's state is a HUE change only (ink disc -> accent disc), and in this palette those two are
   3.54:1 apart — the same contrast trap the accent-mark chooser measured and rejected. So the
   pair is form as well: hollow when stopped, filled when running, which is the fill/no-fill
   distinction the page already uses for the page dots and the toggle berths. */
.t-disc .dsc{{flex:none;display:block;transform:translateY(1px);overflow:visible}}
.t-disc .dsc circle{{fill:none;stroke:var(--ink);stroke-width:1.4;
  transition:fill var(--dur) var(--ease),stroke var(--dur) var(--ease)}}
.t-disc[aria-pressed="true"] .dsc circle{{fill:var(--accent);stroke:var(--accent)}}

/* ── 12 the verb in the reading's line ───────────────────────────────────── */
html[data-place=inline] .mini[data-k=readout] .nt{{display:none}}
.t-readout .w{{color:var(--ink)}}
.t-readout[aria-pressed="true"] .w{{background:var(--ink);color:var(--paper);
  padding:0 .5ch;margin-left:-.5ch}}
</style>
</head>
<body>
<div class="wrap">

<h1>Practice room — the start/stop control</h1>

<p class="lede">Every control below is <b>live</b> — click it and the state changes exactly as
the page’s would. They sit in a mini instrument with the real dial, the real reading row, and
the page’s own tokens and typeface, so what you judge is what would ship.</p>

<p><b>Why it looks wrong right now, measured.</b> The last pass put the WORD on the case’s
centre axis, because the transport is the dial’s caption and the word is what the eye reads.
To get it there the track was taken out of flow — so the word is exactly on the axis
(<code>0.00px</code>) and the track now hangs <b>17.50px to its left</b>, below its baseline,
attached to nothing. Two marks, two alignments. That is the thing to fix.</p>

<p class="note">The constraint the answer has to satisfy: whatever wins applies to BOTH
instruments — the metronome’s transport is the same control — and it has to keep a 44px tap
target and say, at a glance and at a distance, whether the instrument is running. The site’s
existing control grammar (chooser <i>metrotuner-control-taxonomy</i>, pick 03) is: a disc on a
<b>two-pocket track</b> = a toggle; a <b>lone ring</b> = momentary (used by “tap”); a
<b>continuous rail</b> = a value. Option 11 collides with the momentary; option 10 revives the
link idiom that chooser explicitly killed.</p>

<div class="sect" data-name="Placement">
<h2>Q1 · Placement — and this one re-renders the sheet</h2>
<p>Pick a placement and <b>all twelve options below re-render into it</b>, so you are never
judging a treatment against a layout you have already changed.</p>
{places}
<div class="opt"><p class="note">Clicking either one re-renders every option below.</p></div>
</div>

<div class="sect" data-name="Treatment">
<h2>Q2 · The twelve treatments</h2>
<div class="grid">
{opts}
</div>
<div class="opt" style="border:0;padding-top:var(--group)">
  <p class="note">Click an option’s header to pick it — the sheet copies both answers. Or reply
  with numbers.</p>
</div>
</div>

<h2>My read</h2>
<p><b>Placement 01, treatment 02 or 07.</b> The reading row is a flush spread — note hard left,
cents hard right — so dropping the verb into it (placement 02) means the control takes a slot in
that spread instead of the axis, and it only works for the tuner, which would split the two
instruments. On treatment: <b>02 (the track alone)</b> is the honest answer if you trust the
grammar — the disc in the far pocket in accent already says “running”, and it deletes the
alignment problem rather than solving it. <b>07 (word then track, both in flow)</b> keeps the
verb and centres cleanly as one object; its cost is that the word’s own centre is then ~17px off
the needle, which is the tension the last pass was trying to resolve. Those two are the real
choice; the rest are on the sheet so you can see them lose.</p>
<p class="note">Nothing here is committed. The live page is untouched.</p>

</div>
{toggle}
{picker}
<script>
  // ── each control is its own operable latch ────────────────────────────────
  // One delegated listener, but it does NOT branch on which treatment it is: it only flips
  // `aria-pressed` and mirrors it onto the mini so the needle and the in-tune invert respond.
  // Every treatment's APPEARANCE comes from its own CSS keyed on that one attribute — the
  // skill's rule, and the reason a shared handler is safe here.
  document.addEventListener('click', (e) => {{
    const btn = e.target.closest('.tbtn');
    if (!btn) return;
    e.preventDefault();
    const on = btn.getAttribute('aria-pressed') !== 'true';
    // both copies of this option's control (caption slot + reading slot) stay in step
    const mini = btn.closest('.mini');
    for (const b of mini.querySelectorAll('.tbtn')) {{
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const w = b.querySelector('.w');
      if (w) w.textContent = on ? 'stop' : 'start';
      b.setAttribute('aria-label', (on ? 'stop' : 'start') + ' the tuner');
    }}
    if (on) {{
      mini.setAttribute('data-on', '');
      mini.querySelector('.nt').textContent = 'A4';
      mini.querySelector('.ct').textContent = '+0.0';
      mini.querySelector('.hz').textContent = '440.0 Hz';
    }} else {{
      mini.removeAttribute('data-on');
      mini.querySelector('.nt').textContent = '—';
      mini.querySelector('.ct').textContent = '–';
      mini.querySelector('.hz').textContent = '';
    }}
  }});

  // ── the placement question drives every render ────────────────────────────
  // Reads the picker's own selection state rather than adding a second click path, so the
  // pasted answer and the rendered layout cannot disagree.
  //
  // OBSERVED, NOT RACED. The first version listened for `click` on this section and re-read
  // `.opt.sel` inside a `setTimeout(…, 0)`, betting that the picker's own handler had already
  // run. It had not: verified, clicking a placement left `data-place` unchanged while `.sel`
  // was correctly applied — the sheet's layout and its pasted answer silently disagreed. A
  // MutationObserver on the class attribute fires AFTER whoever writes it, whichever order the
  // listeners were bound in, so there is no ordering assumption left to be wrong about.
  const placeSect = document.querySelector('.sect[data-name=Placement]');
  const syncPlace = () => {{
    const sel = placeSect.querySelector('.opt.sel .on');
    const n = sel ? sel.textContent.trim() : '01';
    document.documentElement.setAttribute('data-place', n === '02' ? 'inline' : 'cap');
  }};
  new MutationObserver(syncPlace).observe(placeSect, {{
    subtree: true, attributes: true, attributeFilter: ['class'],
  }});
  syncPlace();
</script>
</body>
</html>
'''

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(HTML)
print(f'wrote {OUT}  ({len(HTML)/1024:.0f} kB)  {len(OPTIONS)} treatments, {len(PLACE)} placements')
