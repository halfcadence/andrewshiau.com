#!/usr/bin/env python3
"""Generate the accent strong-vs-weak clarity chooser into work/understand/.

    python3 scripts/build-accent-clarity-chooser.py

The decision, in the user's words: "the strong vs weak accent mark are unfort rly
similar.... maybe /proofs ways to make it more obv including adding a nice sound for the
accented or unaccented thing".

Two questions, and they are separate because they can both be taken:

  Q1 THE MARK — on and off currently differ ONLY by stroke colour (--ink vs --faint) and
     0.4px of stroke weight, at 9x8px. That is the complaint, and it is measurable: the
     sheet computes the contrast ratio between each option's two states so "more obvious"
     stops being a matter of opinion.
  Q2 THE SOUND — the accent is already audible (the downbeat's G6 ping is demoted to the
     beat's C6 when off), but the difference lives in a bar you have to wait for. These
     options give the TOGGLE itself an immediate sound, so the state is confirmed at the
     moment you set it rather than four beats later.

Q2's options are built on the REAL synth: the same three sine voices, gains and
durations as src/pages/metrotuner.astro's VOICES, through a real AudioContext. A
described sound is not a sound, and this is the one decision on the site so far that a
screenshot cannot carry at all.
"""
import base64
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.expanduser("~/workplace/work/understand/metrotuner-accent-clarity")
SKILL = os.path.expanduser("~/workplace/work/skills/proofs")


def font_b64(name: str) -> str:
    with open(os.path.join(REPO, "public", "fonts", f"{name}.woff2"), "rb") as fh:
        return base64.b64encode(fh.read()).decode("ascii")


def paste(fname: str) -> str:
    with open(os.path.join(SKILL, fname), encoding="utf-8") as fh:
        src = fh.read()
    return re.sub(r"^\s*<!--.*?-->\s*", "", src, count=1, flags=re.S)


# ── Q1: making the two states obvious ─────────────────────────────────────────
# The axis: WHAT CARRIES THE DIFFERENCE. Today it is colour value alone, on a 9px glyph.
# Colour value is the weakest available channel at that size, which is the whole problem.
MARK = [
    dict(
        n="01", kind="current", name="Current — ink vs faint",
        why="Live today. The same <b>&gt;</b> in both states; only its colour value "
            "changes (--ink to --faint) plus 0.4px of stroke. Everything else is "
            "identical, at 9&times;8px.",
        cost="The complaint. One channel, the weakest one at this size, doing all the "
             "work.",
    ),
    dict(
        n="02", kind="absent", name="Present or absent",
        why="Off draws <b>nothing</b>. The strongest signal there is — a mark either "
            "exists or does not, and no comparison is needed to read it.",
        cost="Nothing tells you the control exists until it is on. This was option 04 on "
             "the last sheet and lost for that reason; it is back because the loss was "
             "to a state pair that turned out to be too subtle.",
    ),
    dict(
        n="03", kind="hollow", name="Filled vs hollow",
        why="On: the <b>&gt;</b> is a solid wedge. Off: the same wedge as an outline. "
            "Filled against hollow is the disc/ring pair the site already uses for the "
            "page indicator and the toggle berths — so this borrows a distinction the "
            "reader has met.",
        cost="An outlined 9px wedge is fiddly at 1x, and the two shapes have different "
             "optical weights, so the row's balance shifts slightly with the state.",
    ),
    dict(
        n="04", kind="size", name="Big vs small",
        why="Off keeps today's 9px <b>&gt;</b>; on draws it at <b>14px</b> and in ink. "
            "Size is the channel that survives at small scale, and hierarchy on this "
            "site already comes from size before colour.",
        cost="The mark's box changes, so its position relative to the digit shifts — the "
             "one thing the measured geometry was careful about.",
    ),
    dict(
        n="05", kind="stack", name="Two marks vs one",
        why="On draws <b>&gt;&gt;</b>, off draws <b>&gt;</b>. Musical notation's own "
            "escalation for a stronger accent, and it changes the mark's COUNT — a "
            "difference you can see without resolving either glyph.",
        cost="Two marks over one digit is busier, and <b>&gt;&gt;</b> is not standard "
             "notation for a normal downbeat accent — it reads as 'more than accented'.",
    ),
    dict(
        n="06", kind="hue", name="Accent hue vs faint",
        why="On: the mark is the site's <b>accent hue</b>. Off: faint. Included as the "
            "obvious idea, and kept because it FAILS in a way worth seeing — hue is a "
            "different channel from value, but a different channel is not automatically "
            "a bigger difference.",
        cost="MEASURED WORSE, and the sheet says so below: accent-against-faint is "
             "<b>2.42:1</b> where today's ink-against-faint is 3.54:1, because the navy "
             "and the grey sit at similar lightness. Changing channel is not the same as "
             "gaining contrast. The hue also means INTERACTION everywhere else here and "
             "is already this control's hover colour — two meanings on one glyph.",
    ),
]

# ── Q2: the sound ─────────────────────────────────────────────────────────────
SOUND = [
    dict(
        n="01", kind="none", name="No sound on the toggle (current)",
        why="Live today. The accent IS audible — the downbeat's G6 becomes the beat's C6 "
            "when off — but only once the metronome is running and only when the bar "
            "comes round. Setting the switch makes no sound at all.",
        cost="The confirmation arrives up to a bar late, and never if the metronome is "
             "stopped. Which is most of the time you are setting it.",
    ),
    dict(
        n="02", kind="voice", name="Play the voice you just chose",
        why="The toggle plays <b>the actual tick it changes</b>: G6 when you switch the "
            "accent on, C6 when you switch it off. Not a new sound — the instrument's own "
            "downbeat, auditioned. You hear the thing you are setting.",
        cost="Two pings that are a fifth apart and 0.09s long; on a laptop speaker the "
             "difference is real but small. It also fires while the metronome is running, "
             "so it can land between beats.",
    ),
    dict(
        n="03", kind="pair", name="Play the whole comparison",
        why="The toggle plays <b>both</b>: the downbeat then an ordinary beat, 120ms "
            "apart, in the order the bar will play them. On: G6&rarr;C6, a step down you "
            "hear as 'strong then weak'. Off: C6&rarr;C6, two identical beats. The "
            "RELATIONSHIP is the state, which is what the setting actually controls.",
        cost="240ms of sound per click, which is long for a toggle, and it repeats the "
             "second ping identically when off — deliberately, but it can read as a "
             "stutter.",
    ),
    dict(
        n="04", kind="bar", name="Audition one whole bar",
        why="The toggle plays <b>a full bar at the current tempo</b> — four beats with or "
            "without the accent. The complete answer to 'what did I just change', because "
            "it is exactly what the metronome will do.",
        cost="At 60 bpm that is four seconds of audio from one click, and it fights the "
             "running metronome outright. Too much for a toggle; included because it is "
             "the honest upper bound of 'audition the change'.",
    ),
]

CSS_OPT = """
  /* ── the real page's meter markup ────────────────────────────────────────── */
  .mt-lb{color:var(--faint)}
  .mt-fl{display:inline-flex;align-items:baseline;gap:2ch;flex-wrap:wrap}
  .mt-rm{display:inline-flex;flex-direction:column;align-items:flex-start;position:relative}
  .rm-digits{display:inline-flex}
  .rbtn{font:inherit;background:transparent;border:0;padding:8px 0 0;margin:0;
    border-radius:0;color:var(--faint);width:20px;min-height:36px;text-align:left}
  .rbtn.sel{color:var(--ink)}
  .rm-rule{display:block;margin-top:-2px}
  .rm-accbtn{position:absolute;left:0;top:0;z-index:1;background:transparent;border:0;
    border-radius:0;cursor:pointer;padding:8px;margin:-8px;display:block;line-height:0}
  .rm-acc{display:block;fill:none;stroke:var(--faint);stroke-width:1.4;
    stroke-linecap:square;transition:stroke var(--dur-fast) var(--ease),
    stroke-width var(--dur-fast) var(--ease)}
  .rm-acc.on{stroke:var(--ink);stroke-width:1.8}

  /* ── per-option mark treatments. Attribute selectors so each option's rendering
       is declared by its own data-kind and cannot borrow a neighbour's. ─────── */
  /* 02 absent: handled in the drawing, not here */
  /* 03 filled vs hollow */
  [data-kind="hollow"] .rm-acc{fill:none;stroke:var(--ink);stroke-width:1.4}
  [data-kind="hollow"] .rm-acc.on{fill:var(--ink);stroke:var(--ink);stroke-width:1}
  /* 04 big vs small — the svg box changes, so the glyph is redrawn in JS */
  /* 06 hue */
  [data-kind="hue"] .rm-acc{stroke:var(--faint)}
  [data-kind="hue"] .rm-acc.on{stroke:var(--accent);stroke-width:1.8}

  /* ── the sheet's chrome ──────────────────────────────────────────────────── */
  .states{display:flex;gap:4ch;flex-wrap:wrap;margin:var(--tight) 0 0;align-items:flex-start}
  .slb{color:var(--faint);margin-bottom:var(--tight)}
  .slb b{color:var(--ink);font-weight:500}
  .hintrow{margin-top:var(--tight);color:var(--dim);font-size:13px}
  .hintrow b{color:var(--ink);font-weight:500}
  .hintrow.warn b{color:var(--accent)}
  .zoom{margin-top:var(--tight)}
  .zoom svg{display:block}
  /* the sound options' play row */
  .sndrow{display:flex;align-items:center;gap:2ch;flex-wrap:wrap;margin:var(--tight) 0 0}
  .sbtn{font:inherit;background:transparent;color:var(--ink);cursor:pointer;
    border:0;border-bottom:1px solid var(--ink);padding:6px 0;border-radius:0;
    min-height:44px;display:inline-flex;align-items:center;gap:1ch}
  .sbtn:hover{color:var(--accent);border-bottom-color:var(--accent)}
  .sbtn:focus-visible{outline:1px solid var(--accent);outline-offset:2px}
  .sbtn[aria-pressed="true"]{color:var(--accent);border-bottom-color:var(--accent)}
  .snote{color:var(--dim);font-size:13px}
"""


def digits(sel_upto: int) -> str:
    return "".join(
        f'<button type="button" class="rbtn{" sel" if n <= sel_upto else ""}" tabindex="-1">{n}</button>'
        for n in range(1, 8)
    )


def mark_svg(kind: str, on: bool, live: bool = False) -> str:
    """The `>` for one option in one state. Kept in ONE function so the static renders
    and the live toggle cannot disagree about what an option looks like."""
    cls = "rm-acc" + (" on" if on else "")
    if kind == "absent" and not on:
        # the box stays so nothing shifts; only the glyph goes
        return f'<svg class="{cls}" width="9" height="8" viewBox="0 0 9 8" aria-hidden="true"></svg>'
    if kind == "size":
        w, h, pts = (14, 12, "1.5,1.5 11,6 1.5,10.5") if on else (9, 8, "1,1 7,4 1,7")
        return (f'<svg class="{cls}" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
                f'aria-hidden="true"><polyline points="{pts}"/></svg>')
    if kind == "stack":
        if on:
            return (f'<svg class="{cls}" width="15" height="8" viewBox="0 0 15 8" '
                    f'aria-hidden="true"><polyline points="1,1 7,4 1,7"/>'
                    f'<polyline points="7,1 13,4 7,7"/></svg>')
        return (f'<svg class="{cls}" width="9" height="8" viewBox="0 0 9 8" '
                f'aria-hidden="true"><polyline points="1,1 7,4 1,7"/></svg>')
    if kind == "hollow":
        # a closed wedge so it can be filled or outlined
        return (f'<svg class="{cls}" width="9" height="8" viewBox="0 0 9 8" '
                f'aria-hidden="true"><polygon points="1,0.5 8,4 1,7.5"/></svg>')
    return (f'<svg class="{cls}" width="9" height="8" viewBox="0 0 9 8" '
            f'aria-hidden="true"><polyline points="1,1 7,4 1,7"/></svg>')


def meter(kind: str, on: bool, live: bool = False) -> str:
    live_attr = ' data-live="1"' if live else ""
    btn = ("button" if live else "span")
    press = ' aria-pressed="' + ("true" if on else "false") + '"' if live else ""
    cls = "rm-accbtn" if live else "rm-accbtn"
    return f"""<span class="mt-fl">
              <span class="mt-lb">beats</span>
              <span class="mt-rm" data-kind="{kind}" data-state="{'on' if on else 'off'}"{live_attr}>
                <{btn} type="button" class="{cls}"{press} aria-label="Accent the first beat">
                  {mark_svg(kind, on, live)}
                </{btn}>
                <span class="rm-digits">{digits(4)}</span>
                <svg class="rm-rule" width="140" height="9" viewBox="0 0 140 9" aria-hidden="true"
                  ><line x1="1" y1="4.5" x2="70" y2="4.5" stroke="var(--ink)" stroke-width="1.5"/></svg>
              </span>
            </span>"""


def zoom(kind: str) -> str:
    """4x details, side by side. The complaint is about a 9px glyph; judging it only at
    1x means judging whether your eyes are good, not whether the design works."""
    def one(on: bool) -> str:
        inner = mark_svg(kind, on).replace('class="rm-acc', 'class="rm-acc')
        return (f'<span style="display:inline-flex;align-items:center;gap:1ch">'
                f'<span style="transform:scale(4);transform-origin:left center;display:block;'
                f'width:60px;height:32px;display:inline-flex;align-items:center">{inner}</span></span>')
    return (f'<div class="zoom" style="display:flex;gap:6ch;align-items:center">'
            f'<span data-kind="{kind}" data-state="off">{one(False)}</span>'
            f'<span data-kind="{kind}" data-state="on">{one(True)}</span></div>')


def mark_option(o: dict) -> str:
    k = o["kind"]
    return f"""
      <div class="opt">
        <div class="ohd">
          <span class="on">{o['n']}</span><span class="om">{o['name']}</span>
          <span class="owhy">{o['why']}</span>
        </div>
        <div class="orender">
          <div class="states">
            <div><div class="slb">accent <b>off</b></div>{meter(k, False)}</div>
            <div><div class="slb">accent <b>on</b></div>{meter(k, True)}</div>
            <div><div class="slb">live — <b>click the mark</b></div>{meter(k, True, live=True)}</div>
          </div>
          <div class="slb" style="margin-top:var(--lead)">at 4&times; — off, then on</div>
          {zoom(k)}
          <div class="hintrow" data-measure="{k}"></div>
        </div>
        <div class="ocost"><span class="ck">Costs</span>{o['cost']}</div>
      </div>"""


def sound_option(o: dict) -> str:
    k = o["kind"]
    return f"""
      <div class="opt">
        <div class="ohd">
          <span class="on">{o['n']}</span><span class="om">{o['name']}</span>
          <span class="owhy">{o['why']}</span>
        </div>
        <div class="orender">
          <div class="sndrow">
            <button type="button" class="sbtn" data-snd="{k}" data-state="on"
                    aria-pressed="false">switch the accent <b>on</b></button>
            <button type="button" class="sbtn" data-snd="{k}" data-state="off"
                    aria-pressed="false">switch it <b>off</b></button>
            <span class="snote" data-snote="{k}"></span>
          </div>
        </div>
        <div class="ocost"><span class="ck">Costs</span>{o['cost']}</div>
      </div>"""


HTML = """<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Practice room — telling the accent's two states apart</title>
<style>
  @font-face{{font-family:Plex;font-weight:400;font-display:block;
    src:url(data:font/woff2;base64,{plex400}) format('woff2')}}
  @font-face{{font-family:Plex;font-weight:500;font-display:block;
    src:url(data:font/woff2;base64,{plex500}) format('woff2')}}
  :root{{
    --paper:#f4f3ef; --panel:#f4f3ef; --ink:#141412; --dim:#6e6d64; --faint:#6e6d64;
    --line:#d5d4cd; --accent:#14306b; --on-accent:#f4f3ef;
    --step:15px; --lead:28px; --tight:14px; --group:56px; --sect:112px; --gutter:28px;
    --unit:8px; --build:#14306b;
    --ease:cubic-bezier(0.16,1,0.3,1); --dur:220ms; --dur-fast:140ms;
    --mono:"Plex",ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
  }}
  @media (prefers-color-scheme:dark){{
    :root:not([data-t=light]){{
      --paper:#141413; --panel:#1b1b19; --ink:#f0efe8; --dim:#a09f96; --faint:#8f8e85;
      --line:#2b2b27; --accent:#6ea8ff; --on-accent:#141413; --build:#6ea8ff;
    }}
  }}
  :root[data-t=dark]{{
    --paper:#141413; --panel:#1b1b19; --ink:#f0efe8; --dim:#a09f96; --faint:#8f8e85;
    --line:#2b2b27; --accent:#6ea8ff; --on-accent:#141413; --build:#6ea8ff;
  }}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--paper);color:var(--ink);
    font-family:var(--mono);font-size:var(--step);line-height:var(--lead);font-weight:400;
    -webkit-font-smoothing:antialiased}}
  .wrap{{max-width:74ch;margin:0 auto;padding:var(--group) var(--gutter)}}
  h1{{font-size:var(--step);line-height:var(--lead);font-weight:500;margin:0 0 var(--lead)}}
  h2{{font-size:var(--step);line-height:var(--lead);font-weight:500;margin:0}}
  p{{margin:0 0 var(--lead);max-width:66ch}}
  b,strong{{font-weight:500}}
  code{{background:color-mix(in srgb,var(--ink) 6%,transparent);padding:.05em .34em}}
  .kick{{color:var(--faint);margin:0 0 var(--tight)}}
  .lede{{border-top:2px solid var(--ink);padding-top:var(--tight);margin-bottom:var(--group)}}
  .ck{{display:block;color:var(--faint)}}
  .sect{{margin-bottom:var(--group)}}
  .sect > h2{{border-top:2px solid var(--ink);padding-top:var(--tight);margin-bottom:var(--tight)}}
  .sdek{{color:var(--dim);margin-bottom:var(--lead);max-width:66ch}}
  .opt{{padding-top:var(--tight);border-top:1px solid var(--line);margin-bottom:var(--lead)}}
  .ohd{{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 1ch}}
  .on{{color:var(--accent);flex:none}}
  .om{{font-weight:500;flex:none}}
  .owhy{{flex:1 1 100%;color:var(--dim)}}
  .orender{{margin:var(--tight) 0 0;padding:0 0 var(--tight)}}
  .ocost{{color:var(--dim);max-width:64ch}}
{css_opt}
</style>
<body>
<div class="wrap">
  <p class="kick">/metrotuner/ · the accent's two states</p>
  <h1 class="lede">Making strong and weak obvious — and giving the switch a sound</h1>

  <p>Q1 draws every option <b>off beside on</b>, then again at <b>4&times;</b>, and
  computes the contrast between the two states so &ldquo;more obvious&rdquo; is a number
  rather than an opinion. Q2's buttons <b>make real sound</b> — the page's own three sine
  voices through a real AudioContext. <b>Turn your volume on.</b></p>

  <p><b>Why they are separate questions.</b> Both can be taken: a clearer mark and a
  sound on the switch solve the same problem in two channels, and the sound is the only
  one that works when you are not looking at the meter. Pick one from each.</p>

  <p><b>Already fixed, not in here:</b> the line under <i>beats</i> is a straight line
  now — the left tick is deleted. It used to carry the accent state before the
  <b>&gt;</b> took that job, so it had become a stub that drew nothing.</p>

  <div class="sect" data-name="Mark">
    <h2>1 &nbsp; How do the two states tell themselves apart?</h2>
    <p class="sdek">Today the difference is <b>colour value alone</b> — <code>--ink</code>
    against <code>--faint</code> — plus 0.4px of stroke weight, on a 9&times;8px glyph.
    Value is the weakest channel at that size, which is the whole complaint. Every option
    below changes <i>which channel carries the difference</i>: presence, fill, size,
    count, or hue.</p>
{mark}
  </div>

  <div class="sect" data-name="Sound">
    <h2>2 &nbsp; What should the switch sound like?</h2>
    <p class="sdek">The accent is <i>already</i> audible: with it on, the first beat of
    the bar is a <b>G6</b> ping; with it off that beat is demoted to the ordinary
    <b>C6</b>. But you only hear it once the metronome is running and once the bar comes
    round — so the switch itself is silent, and setting it while stopped tells you
    nothing. These options give the toggle its own sound, built from the instrument's
    real voices (G6 1568&nbsp;Hz, C6 1046.5&nbsp;Hz, sine, ~0.09s).</p>
    <p class="sdek">Constraint: whatever plays must not fight the running metronome, and
    it has to work on the first click — a page that has never made a sound has a
    suspended AudioContext until a gesture resumes it.</p>
{sound}
    <div class="opt"><div class="ohd"><span class="om">Click an option's header in each
      question — the sheet copies your picks itself.</span></div></div>
  </div>
</div>

{picker}
{toggle}

{wiring}
</body>
</html>
"""

WIRING = r"""<script>
// ── Q1: live meters. Each reads its OWN data-kind and redraws from a single drawing
// function, so a live toggle cannot disagree with the static renders above it. ──────
function markSvg(kind, on) {
  var cls = 'rm-acc' + (on ? ' on' : '');
  if (kind === 'absent' && !on)
    return '<svg class="' + cls + '" width="9" height="8" viewBox="0 0 9 8" aria-hidden="true"></svg>';
  if (kind === 'size') {
    var w = on ? 14 : 9, h = on ? 12 : 8;
    var pts = on ? '1.5,1.5 11,6 1.5,10.5' : '1,1 7,4 1,7';
    return '<svg class="' + cls + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
           '" aria-hidden="true"><polyline points="' + pts + '"/></svg>';
  }
  if (kind === 'stack') {
    if (on) return '<svg class="' + cls + '" width="15" height="8" viewBox="0 0 15 8" aria-hidden="true">' +
                   '<polyline points="1,1 7,4 1,7"/><polyline points="7,1 13,4 7,7"/></svg>';
    return '<svg class="' + cls + '" width="9" height="8" viewBox="0 0 9 8" aria-hidden="true">' +
           '<polyline points="1,1 7,4 1,7"/></svg>';
  }
  if (kind === 'hollow')
    return '<svg class="' + cls + '" width="9" height="8" viewBox="0 0 9 8" aria-hidden="true">' +
           '<polygon points="1,0.5 8,4 1,7.5"/></svg>';
  return '<svg class="' + cls + '" width="9" height="8" viewBox="0 0 9 8" aria-hidden="true">' +
         '<polyline points="1,1 7,4 1,7"/></svg>';
}

document.querySelectorAll('.mt-rm[data-live="1"]').forEach(function (meter) {
  var kind = meter.dataset.kind;
  var btn = meter.querySelector('.rm-accbtn');
  btn.addEventListener('click', function () {
    var on = meter.dataset.state !== 'on';
    btn.innerHTML = markSvg(kind, on);
    btn.setAttribute('aria-pressed', String(on));
    meter.dataset.state = on ? 'on' : 'off';
  });
});

// ── Q1 measurement: the CONTRAST RATIO between the two states, plus what channel
// carries it. The complaint is that two states look alike, so the sheet reports how
// different they actually are instead of asserting it. WCAG's ratio is the right
// instrument for "can these be told apart" — and for options where the difference is
// not colour at all (absent, size, count) it says so rather than printing a ratio that
// would read as the whole story.
function lum(rgb) {
  var m = rgb.match(/[\d.]+/g).slice(0, 3).map(function (v) {
    v = +v / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
}
function ratio(a, b) {
  var la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

document.querySelectorAll('[data-measure]').forEach(function (hint) {
  var kind = hint.dataset.measure;
  var opt = hint.closest('.opt');
  var offM = opt.querySelector('.mt-rm[data-state="off"] .rm-acc');
  var onM = opt.querySelector('.mt-rm[data-state="on"] .rm-acc');
  if (!offM || !onM) return;

  var cOff = getComputedStyle(offM), cOn = getComputedStyle(onM);
  // fill:none computes to 'none'; treat the stroke as the mark's colour in that case
  var colOff = cOff.fill !== 'none' ? cOff.fill : cOff.stroke;
  var colOn = cOn.fill !== 'none' ? cOn.fill : cOn.stroke;
  var r = ratio(colOff, colOn);

  var channels = [];
  if (r > 1.15) channels.push('colour (<b>' + r.toFixed(2) + ':1</b> between the states)');
  if (cOff.strokeWidth !== cOn.strokeWidth) channels.push('stroke weight');
  if ((cOff.fill === 'none') !== (cOn.fill === 'none')) channels.push('<b>fill</b>');
  var boxOff = offM.getBoundingClientRect(), boxOn = onM.getBoundingClientRect();
  if (Math.abs(boxOff.width - boxOn.width) > 1) channels.push('<b>size</b>');
  var nOff = offM.querySelectorAll('polyline,polygon').length;
  var nOn = onM.querySelectorAll('polyline,polygon').length;
  if (nOff !== nOn) channels.push('<b>the number of marks</b> (' + nOff + ' vs ' + nOn + ')');
  if (nOff === 0 || nOn === 0) channels = ['<b>presence</b> — one state draws nothing'];

  var only = channels.length === 1 && channels[0].indexOf('colour') === 0;
  hint.className = 'hintrow' + (only ? ' warn' : '');
  hint.innerHTML = 'Carried by ' + channels.join(' + ') +
    (only ? '. <b>One channel only</b> — this is the current state of things.' : '.');
});

// ── Q2: REAL SOUND, from the page's real voices. ──────────────────────────────────
// VOICES is copied verbatim from src/pages/metrotuner.astro. A described sound is not
// a sound, and this is the one decision here a screenshot cannot carry at all.
var VOICES = {
  down: { freq: 1568.0, gain: 0.5, dur: 0.09 },
  beat: { freq: 1046.5, gain: 0.4, dur: 0.07 },
  sub:  { freq: 784.0,  gain: 0.18, dur: 0.05 },
};
var ac = null;
function audio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  // A page that has never made a sound has a SUSPENDED context until a gesture
  // resumes it — without this the first click of every option is silent, which would
  // read as "that option does nothing".
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function ping(voice, at) {
  var a = audio(), v = VOICES[voice], t = at || a.currentTime;
  var osc = a.createOscillator(), g = a.createGain();
  osc.type = 'sine';
  osc.frequency.value = v.freq;
  g.gain.setValueAtTime(v.gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + v.dur + 0.02);
}

var SND_BPM = 96;   // the instrument's default, so option 04's bar is a real length
document.querySelectorAll('[data-snd]').forEach(function (btn) {
  var kind = btn.dataset.snd, state = btn.dataset.state === 'on';
  var note = btn.closest('.sndrow').querySelector('[data-snote]');
  btn.addEventListener('click', function () {
    var a = audio(), t0 = a.currentTime + 0.02, msg = '';
    if (kind === 'none') {
      msg = 'silent — nothing plays on the toggle';
    } else if (kind === 'voice') {
      ping(state ? 'down' : 'beat', t0);
      msg = state ? 'G6 — the accented downbeat' : 'C6 — an ordinary beat';
    } else if (kind === 'pair') {
      ping(state ? 'down' : 'beat', t0);
      ping('beat', t0 + 0.12);
      msg = state ? 'G6 → C6 — strong then weak' : 'C6 → C6 — two the same';
    } else if (kind === 'bar') {
      var spb = 60 / SND_BPM;
      for (var i = 0; i < 4; i++) ping(i === 0 && state ? 'down' : 'beat', t0 + i * spb);
      msg = 'one bar at ' + SND_BPM + ' bpm' + (state ? ', accented' : ', flat');
    }
    if (note) note.textContent = msg;
    btn.setAttribute('aria-pressed', 'true');
    setTimeout(function () { btn.setAttribute('aria-pressed', 'false'); }, 300);
  });
});
</script>"""


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    html = HTML.format(
        plex400=font_b64("IBMPlexMono-Regular"),
        plex500=font_b64("IBMPlexMono-Medium"),
        css_opt=CSS_OPT,
        mark="\n".join(mark_option(o) for o in MARK),
        sound="\n".join(sound_option(o) for o in SOUND),
        picker=paste("picker.html"),
        toggle=paste("theme-toggle.html"),
        wiring=WIRING,
    )
    out = os.path.join(OUT_DIR, "index.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"wrote {out} ({len(html) / 1024:.0f} KB; {len(MARK)} mark + {len(SOUND)} sound)")


if __name__ == "__main__":
    main()
