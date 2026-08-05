#!/usr/bin/env python3
"""Generate the metrotuner meter/tap/casing chooser into work/understand/.

    python3 scripts/build-meter-chooser.py

Three questions on one sheet, all raised together (2026-08-05):

  1 ACCENT MARK  — "for the beat accent what about like a line above. greyed out if off,
    solid if on. or maybe literal accent". Today the state is a 3px tick-height change
    plus a weight bump on the digit 1.
  2 TAP FEEDBACK — "the tap feels pretty unsatisfying... think about what makes those
    nice, might need a bit of juice. inspo from like games? electric instruments? but
    translate to minimal."
  3 LABEL CASE   — "can a4 and hz be lowercase, seems like all copy in this is".

Same generator shape as build-scrub-chooser.py, same reasons: one self-contained file
over `file://` means the woff2 faces go in base64, and the tokens and control markup are
lifted from the real page rather than eyeballed.

TWO BUGS from a first draft of this sheet, both fixed here and both worth naming because
either would have made the sheet lie:

  * `.rbtn.on` — the meter's selected digits carried class `on`, which is ALSO the
    picker's "this element is the option number" hook. The picker walks `.opt` looking
    for `.on`, so 15 meter digits were being read as option numbers. It only appeared to
    work because the real `.on` came first in DOM order. The meter's class is `sel` now;
    the picker's contract owns `.on` and nothing else may use it.
  * A "measurement" that printed the same sentence for every option (`1 of 2 drawn rows
    differ`) because it diffed serialised SVG per row rather than the rendered pixels.
    A number that cannot distinguish the candidates is decoration. It is replaced by a
    real ink-area count taken from the DOM geometry of the drawn marks.
"""
import base64
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.expanduser("~/workplace/work/understand/metrotuner-meter-tap")
SKILL = os.path.expanduser("~/workplace/work/skills/proofs")


def font_b64(name: str) -> str:
    with open(os.path.join(REPO, "public", "fonts", f"{name}.woff2"), "rb") as fh:
        return base64.b64encode(fh.read()).decode("ascii")


def paste(fname: str) -> str:
    with open(os.path.join(SKILL, fname), encoding="utf-8") as fh:
        src = fh.read()
    return re.sub(r"^\s*<!--.*?-->\s*", "", src, count=1, flags=re.S)


# ── Q1: the accent mark ───────────────────────────────────────────────────────
ACCENT = [
    dict(
        n="01", kind="current", name="Current — tick height + bold 1",
        why="Live today. On: the rule's left tick stands full-height in ink and the digit "
            "1 carries weight 500. Off: a flush faint stub and a plain 1.",
        cost="What prompted the question. Both deltas are about 3px and both sit below "
             "the digits, so you have to know where to look.",
    ),
    dict(
        n="02", kind="over-line", name="A line above the 1",
        why="Your first idea. A short rule above the digit 1 — <b>faint</b> when off, "
            "<b>ink</b> when on. The mark never moves, so its position is learnable and "
            "the state is a value change on one object.",
        cost="A second horizontal rule on a control whose whole idiom is one horizontal "
             "rule. Two parallel lines can read as one thicker thing.",
    ),
    dict(
        n="03", kind="over-acute", name="A literal accent over the 1",
        why="Your second idea, taken literally: an <b>acute accent</b>, the mark in "
            "<i>é</i>, over the 1. Faint off, ink on. The only non-horizontal mark on the "
            "meter, so it cannot be mistaken for structure.",
        cost="A diagonal in a system of horizontals and rings. It is also a pun, and a "
             "pun that needs explaining is a bad one.",
    ),
    dict(
        n="04", kind="over-acute-absent", name="Accent over the 1, nothing when off",
        why="Same acute as 03, but off draws <b>nothing</b>. Presence is the state — the "
            "strongest signal available, and the site's habit of rationing marks rather "
            "than dimming them.",
        cost="Nothing tells you the mark exists until it is on. A control whose off state "
             "is blank does not announce that it has an on state.",
    ),
    dict(
        n="05", kind="over-line-accent", name="A line above, in the accent hue",
        why="The other reading of &ldquo;literal accent&rdquo;: the site has one accent "
            "hue and on the instrument it already marks active state — a latched disc, "
            "the digits mid-scrub. On: <b>accent</b>. Off: faint.",
        cost="Hue is this site's interaction signal, so a coloured mark can read as "
             "&ldquo;clickable&rdquo;. It also carries only one difference, which fails a "
             "reader who cannot separate the two hues.",
    ),
]

# ── Q2: the tap ───────────────────────────────────────────────────────────────
# The brief: games and electric instruments, translated to minimal. What actually makes
# those feel good, stated as mechanics rather than styling:
#   ANTICIPATION — something moves on press, before the result
#   OVERSHOOT    — the response exceeds the input, then settles (a key's snap)
#   PERSISTENCE  — the last few strikes stay visible; you can see your own rhythm
#   CONFIRMATION — the moment the machine agrees with you is marked
# Each option picks ONE of those. Stacking them is how a delight becomes noise.
TAP = [
    dict(
        n="01", kind="current", name="Current — fill and drain",
        why="Live today. Each strike fills the 14px ring accent instantly, then the fill "
            "drains over 300ms. One event, one ring, nothing retained.",
        cost="The drain is the whole response, and 300ms of fade on a 14px circle is a "
             "small amount of ink moving slowly — which is what reads as flat.",
    ),
    dict(
        n="02", kind="snap", name="Snap — overshoot and settle",
        why="The <b>key mechanic</b>, from a real switch: the ring scales to 1.9&times; on "
            "press within 90ms, then settles back with the site's own easing. Nothing "
            "changes colour. The response is bigger than the input and then resolves.",
        cost="Motion on every strike, at up to 320 bpm. It must respect "
             "<code>prefers-reduced-motion</code>, and at speed the settle overlaps the "
             "next press.",
    ),
    dict(
        n="03", kind="trail", name="Trail — the last four strikes persist",
        why="The <b>persistence mechanic</b>, from a drum machine's step row: each strike "
            "leaves a mark and the marks decay in place, so you <i>see the rhythm you "
            "just played</i> rather than one blink. Four discs, oldest faintest.",
        cost="Four marks where there was one, and they are only meaningful while tapping. "
             "It adds a row to the foot line that is empty most of the time.",
    ),
    dict(
        n="04", kind="lock", name="Lock — mark the moment it agrees",
        why="The <b>confirmation mechanic</b>. Taps 1 and 2 do nothing visible beyond the "
            "press; on the tap that first yields a tempo, the bpm numeral itself flashes "
            "to accent. The reward lands where the <i>result</i> is, not on the button.",
        cost="The button stays as flat as it is today for the first two strikes, which is "
             "exactly when a user is asking &ldquo;did that register?&rdquo;",
    ),
    dict(
        n="05", kind="ripple", name="Ripple — one expanding ring",
        why="A single ring expands from the strike point and fades, over 340ms. The "
            "familiar touch-feedback mechanic, drawn as one hairline circle rather than a "
            "filled splash.",
        cost="The most decorative option here — an expanding circle is a borrowed "
             "material-design gesture, and it draws attention to the button rather than "
             "to the tempo.",
    ),
]

# ── Q3: the label case ────────────────────────────────────────────────────────
CASE = [
    dict(
        n="01", kind="upper", name="Current — A4 / Hz",
        why="Live today. <code>A4</code> and <code>Hz</code> keep their conventional "
            "capitals; <code>beats</code> and <code>subdivide</code> are lowercase.",
        cost="The inconsistency you spotted. Two labels in one row follow different "
             "rules, and nothing on screen says why.",
    ),
    dict(
        n="02", kind="lower", name="All lowercase — a4 / hz",
        why="Your ask, applied flatly: every label on the instrument is lowercase, like "
            "every other word on it. One rule, no exceptions to remember.",
        cost="<code>hz</code> is a wrong unit symbol — SI capitalises a unit named after a "
             "person (Hertz), and <code>a4</code> is not how a note is written anywhere. "
             "It reads as a typo to a musician.",
    ),
    dict(
        n="03", kind="lower-label-keep-value", name="Labels lowercase, VALUES keep case",
        why="The distinction the flat version misses: <code>a4</code> and <code>hz</code> "
            "here are <b>labels on a control</b>, not values in a reading. So they go "
            "lowercase with the other labels — while the tuner's readout, which states a "
            "real note, keeps <code>A4</code>.",
        cost="Two forms of the same string on one screen — the calibration says "
             "<code>a4</code>, the readout says <code>A4</code>. Defensible, and it still "
             "has to be looked at.",
    ),
]

CSS_OPT = """
  /* ── the real page's control markup, from src/pages/metrotuner.astro ────── */
  .mt-lb{color:var(--faint)}
  .mt-fl{display:inline-flex;align-items:baseline;gap:2ch;flex-wrap:wrap}
  .mt-rm{display:inline-flex;flex-direction:column;align-items:flex-start}
  .rm-digits{display:inline-flex}
  /* `sel`, NOT `on` — `.on` is the picker's option-number hook and a meter digit
     wearing it gets counted as an option. See this file's module docstring. */
  .rbtn{font:inherit;background:transparent;border:0;padding:8px 0 0;margin:0;
    border-radius:0;color:var(--faint);width:20px;min-height:36px;text-align:left}
  .rbtn.sel{color:var(--ink)}
  .rbtn.acc1{font-weight:500}
  .rm-rule{display:block;margin-top:-2px}
  .rm-rulebtn{font:inherit;background:transparent;border:0;margin:0;cursor:pointer;
    border-radius:0;display:block;padding:0 0 14px}
  /* the mark row: ALWAYS present and always the same height, so nothing below moves
     when a mark appears. Option 04 draws nothing when off; a collapsing row would
     make the whole meter jump on every toggle. */
  .rm-over{display:block;height:8px;margin-bottom:1px}

  /* the tap button, as it ships */
  .tbtn{font:inherit;background:transparent;border:0;padding:10px 0;margin:0;
    border-radius:0;cursor:pointer;color:var(--ink);display:inline-flex;
    align-items:center;gap:1ch}
  .tk{flex:none;overflow:visible}
  .mom .tk circle{fill:transparent;stroke:var(--dim);stroke-width:1.4;
    transition:fill 300ms var(--ease),stroke 300ms var(--ease)}
  /* THE FILL-AND-DRAIN IS OPTION 01's MECHANIC, so it is scoped to `k-current`.
     Unscoped (`.mom.hit`), it painted the accent fill on EVERY option that adds `.hit`
     — snap got a colour change it is explicitly defined as not having, and the sheet
     would have shown two mechanics stacked while claiming each option carries one.
     A shared default is how a chooser silently stops isolating its variables. */
  .mom.k-current.hit .tk circle{fill:var(--accent);stroke:var(--accent);transition:none}
  /* 02 snap: scale the ring, no colour change */
  .mom.k-snap .tk{transition:transform 90ms var(--ease)}
  .mom.k-snap.hit .tk{transform:scale(1.9)}
  .mom.k-snap .tk circle{transition:none}
  .mom.k-snap.hit .tk circle{fill:transparent;stroke:var(--ink)}
  /* 03 trail */
  /* `taptrail`, NOT `trail`: the BUTTON already carries its kind as a class, so
     `.trail` matched the button too and `parentElement.querySelector('.trail')`
     returned it — a node with no <i> children, so every strike threw. The option
     rendered as a dead button that looked like a deliberate "no feedback" choice,
     which is the exact failure mode /proofs warns about. Names for a behaviour hook
     and names for a style hook must not share a namespace. */
  .taptrail{display:inline-flex;gap:6px;align-items:center;margin-left:2ch;height:14px}
  /* LINEAR, and 1.6s — not the site's --ease over 600ms. Measured on the first
     version: --ease is cubic-bezier(0.16,1,0.3,1), which front-loads hard, so a dot
     was at 0.10 opacity by 150ms and fully gone by 450ms. At 120bpm (500ms/strike)
     the previous dot had vanished before the next one landed, so NOTHING persisted —
     the option was "one blink, four times", which is the thing it exists not to be.
     Persistence needs a decay slower than the beat, and linear so the older strikes
     step down evenly instead of all sitting near zero. */
  .taptrail i{width:6px;height:6px;border-radius:50%;background:var(--ink);
    opacity:0;transition:opacity 1600ms linear}
  /* 05 ripple */
  .rip{position:relative;display:inline-flex}
  .rip .rc{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;
    border:1px solid var(--accent);border-radius:50%;opacity:0;pointer-events:none}
  .rip.go .rc{animation:rippleout 340ms var(--ease)}
  @keyframes rippleout{
    from{transform:scale(.6);opacity:.9}
    to{transform:scale(3.2);opacity:0}
  }
  /* 04 lock: the RESULT flashes, not the button */
  .bpmout{margin-left:2ch;color:var(--faint)}
  .bpmout b{color:var(--ink);font-weight:400;transition:color 400ms var(--ease)}
  .bpmout.lock b{color:var(--accent);transition:none}

  @media (prefers-reduced-motion: reduce){
    .mom.k-snap .tk,.taptrail i,.bpmout b{transition:none}
    .rip.go .rc{animation:none}
  }

  /* ── the sheet's chrome for showing two states / driving a control ───────── */
  .states{display:flex;gap:4ch;flex-wrap:wrap;margin:var(--tight) 0 0}
  .slb{color:var(--faint);margin-bottom:var(--tight)}
  .slb b{color:var(--ink);font-weight:500}
  .hintrow{margin-top:var(--tight);color:var(--dim);font-size:13px}
  .hintrow b{color:var(--ink);font-weight:500}
  .taprow{display:flex;align-items:center;gap:2ch;flex-wrap:wrap;margin:var(--tight) 0 0}
  .ctop{display:flex;align-items:baseline;gap:4ch;flex-wrap:wrap}
"""


def digits(sel_upto: int, bold_one: bool) -> str:
    out = ""
    for n in range(1, 8):
        cls = "rbtn" + (" sel" if n <= sel_upto else "") + (" acc1" if n == 1 and bold_one else "")
        out += f'<button type="button" class="{cls}" tabindex="-1">{n}</button>'
    return out


def accent_meter(kind: str, on: bool, live: bool = False) -> str:
    over = ""
    w = 2 if on else 1.5
    if kind in ("over-line", "over-line-accent"):
        colour = "var(--ink)" if on else "var(--faint)"
        if kind == "over-line-accent" and on:
            colour = "var(--accent)"
        over = f'<line x1="2" y1="6" x2="14" y2="6" stroke="{colour}" stroke-width="{w}"/>'
    elif kind == "over-acute" or (kind == "over-acute-absent" and on):
        colour = "var(--ink)" if on else "var(--faint)"
        over = (f'<line x1="4" y1="7" x2="12" y2="1" stroke="{colour}" '
                f'stroke-width="{w}" stroke-linecap="square"/>')

    if kind == "current":
        tick = ('<line x1="1.5" y1="0" x2="1.5" y2="9" stroke="var(--ink)" stroke-width="2.5"/>'
                if on else
                '<line x1="1.5" y1="3" x2="1.5" y2="6" stroke="var(--faint)" stroke-width="2.5"/>')
    else:
        tick = '<line x1="1.5" y1="3" x2="1.5" y2="6" stroke="var(--faint)" stroke-width="2.5"/>'
    rule = tick + '<line x1="1" y1="4.5" x2="70" y2="4.5" stroke="var(--ink)" stroke-width="1.5"/>'

    live_attr = ' data-live="1"' if live else ''
    return f"""<span class="mt-fl">
              <span class="mt-lb">beats</span>
              <span class="mt-rm"{live_attr} data-kind="{kind}" data-state="{'on' if on else 'off'}">
                <svg class="rm-over" width="140" height="8" viewBox="0 0 140 8" aria-hidden="true">{over}</svg>
                <span class="rm-digits">{digits(4, kind == 'current' and on)}</span>
                <button type="button" class="rm-rulebtn" aria-label="Accent the first beat"
                        aria-pressed="{'true' if on else 'false'}">
                  <svg class="rm-rule" width="140" height="9" viewBox="0 0 140 9" aria-hidden="true">{rule}</svg>
                </button>
              </span>
            </span>"""


def accent_option(o: dict) -> str:
    return f"""
      <div class="opt">
        <div class="ohd">
          <span class="on">{o['n']}</span><span class="om">{o['name']}</span>
          <span class="owhy">{o['why']}</span>
        </div>
        <div class="orender">
          <div class="states">
            <div><div class="slb">accent <b>off</b></div>{accent_meter(o['kind'], False)}</div>
            <div><div class="slb">accent <b>on</b></div>{accent_meter(o['kind'], True)}</div>
            <div><div class="slb">live — <b>click the rule</b></div>{accent_meter(o['kind'], True, live=True)}</div>
          </div>
          <div class="hintrow" data-measure="accent"></div>
        </div>
        <div class="ocost"><span class="ck">Costs</span>{o['cost']}</div>
      </div>"""


def tap_option(o: dict) -> str:
    k = o["kind"]
    ring = ('<span class="rip"><svg class="tk" width="14" height="14" viewBox="0 0 14 14" '
            'aria-hidden="true"><circle cx="7" cy="7" r="4.6"/></svg><i class="rc"></i></span>'
            if k == "ripple" else
            '<svg class="tk" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
            '<circle cx="7" cy="7" r="4.6"/></svg>')
    extra = ""
    if k == "trail":
        extra = '<span class="taptrail"><i></i><i></i><i></i><i></i></span>'
    if k == "lock":
        extra = '<span class="bpmout"><b>96</b> bpm</span>'
    return f"""
      <div class="opt">
        <div class="ohd">
          <span class="on">{o['n']}</span><span class="om">{o['name']}</span>
          <span class="owhy">{o['why']}</span>
        </div>
        <div class="orender">
          <div class="taprow">
            <button type="button" class="tbtn mom k-{k}" data-tap="{k}">
              {ring}<span class="w">tap</span>
            </button>
            {extra}
          </div>
          <div class="hintrow">Tap it several times, in rhythm.</div>
        </div>
        <div class="ocost"><span class="ck">Costs</span>{o['cost']}</div>
      </div>"""


def case_option(o: dict) -> str:
    k = o["kind"]
    a4, hz = ("A4", "Hz") if k == "upper" else ("a4", "hz")
    readout = "A4" if k in ("upper", "lower-label-keep-value") else "a4"
    return f"""
      <div class="opt">
        <div class="ohd">
          <span class="on">{o['n']}</span><span class="om">{o['name']}</span>
          <span class="owhy">{o['why']}</span>
        </div>
        <div class="orender">
          <div class="ctop">
            <span class="mt-fl">
              <span class="mt-lb">{a4}</span>
              <span style="min-width:6ch;text-align:center;border-bottom:1px solid var(--ink);
                           padding:8px 0;display:inline-block">440</span>
              <span class="mt-lb">{hz}</span>
            </span>
            <span class="mt-fl"><span class="mt-lb">beats</span>
              <span class="mt-rm"><span class="rm-digits">{digits(4, False)}</span></span>
            </span>
          </div>
          <div class="hintrow">The tuner's readout, for comparison:
            <b>{readout}</b> &middot; the reference-tone button: <b>{readout}</b></div>
        </div>
        <div class="ocost"><span class="ck">Costs</span>{o['cost']}</div>
      </div>"""


HTML = """<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Practice room — the accent mark, the tap, and the label case</title>
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
  <p class="kick">/metrotuner/ · three nits</p>
  <h1 class="lede">The accent mark, the tap, and the label case</h1>

  <p>Everything below is <b>live and real</b>: the actual tokens, the actual 15px Plex,
  the actual meter and tap markup. Q1 draws each option <b>off beside on</b>, because
  that question is entirely about telling the two apart. Q2's buttons respond to a real
  press — tap them in rhythm.</p>

  <div class="sect" data-name="Accent mark">
    <h2>1 &nbsp; How should &ldquo;accent the first beat&rdquo; read?</h2>
    <p class="sdek">There is no label or latch — the beats rule <i>is</i> the switch
    (chooser <code>metrotuner-round15</code>, Q1/06), a 140&times;26px target under the
    digits. That stays whichever option wins; this is only about the mark that states the
    state. The mark row is a fixed height in every option, so nothing below it moves when
    a mark appears.</p>
{accent}
  </div>

  <div class="sect" data-name="Tap feedback">
    <h2>2 &nbsp; What makes the tap feel like something?</h2>
    <p class="sdek">Four things make a game button or a synth pad satisfying, and they are
    mechanics rather than decoration: <b>anticipation</b> (something moves on press,
    before the result), <b>overshoot</b> (the response exceeds the input, then settles),
    <b>persistence</b> (recent strikes stay visible, so you see your own rhythm), and
    <b>confirmation</b> (the moment the machine agrees with you is marked). Each option
    below takes <b>one</b> of those. Stacking them is how a delight becomes noise, which
    is why none of these combine two.</p>
    <p class="sdek">Constraint: tap fires on <b>pointerdown</b> (hardware switches close
    on press; measuring on release folds the press duration into the averaged intervals),
    it can run at up to <b>320&nbsp;bpm</b>, and anything animated has to fall back under
    <code>prefers-reduced-motion</code>.</p>
{tap}
  </div>

  <div class="sect" data-name="Label case">
    <h2>3 &nbsp; A4 / Hz, or a4 / hz?</h2>
    <p class="sdek">Every other word on the instrument is lowercase: <code>beats</code>,
    <code>subdivide</code>, <code>tap</code>, <code>start the metronome</code>,
    <code>play tone</code>, <code>uses the microphone, on this device only</code>. The
    two capitalised labels are the odd ones out. The complication is that
    <code>A4</code> also appears as a <i>value</i> — the tuner's note readout and the
    reference-tone button — and a note name is written with a capital everywhere in
    music. Each option shows the control row and states what the readout would say.</p>
{case}
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
// ── Q1: each live meter toggles between ITS OWN two states ───────────────────
// Every control reads its own data-kind and redraws from that. No handler asks which
// option number it is in, so one option cannot borrow another's mark.
document.querySelectorAll('.mt-rm[data-live="1"]').forEach(function (meter) {
  var kind = meter.dataset.kind;
  var over = meter.querySelector('.rm-over');
  var rule = meter.querySelector('.rm-rule');
  var one = meter.querySelector('.rbtn');
  var btn = meter.querySelector('.rm-rulebtn');
  function draw(on) {
    var ink = 'var(--ink)', faint = 'var(--faint)', w = on ? 2 : 1.5, o = '';
    if (kind === 'over-line' || kind === 'over-line-accent') {
      var c = on ? (kind === 'over-line-accent' ? 'var(--accent)' : ink) : faint;
      o = '<line x1="2" y1="6" x2="14" y2="6" stroke="' + c + '" stroke-width="' + w + '"/>';
    } else if (kind === 'over-acute' || (kind === 'over-acute-absent' && on)) {
      o = '<line x1="4" y1="7" x2="12" y2="1" stroke="' + (on ? ink : faint) +
          '" stroke-width="' + w + '" stroke-linecap="square"/>';
    }
    over.innerHTML = o;
    var tick = kind === 'current'
      ? (on ? '<line x1="1.5" y1="0" x2="1.5" y2="9" stroke="' + ink + '" stroke-width="2.5"/>'
            : '<line x1="1.5" y1="3" x2="1.5" y2="6" stroke="' + faint + '" stroke-width="2.5"/>')
      : '<line x1="1.5" y1="3" x2="1.5" y2="6" stroke="' + faint + '" stroke-width="2.5"/>';
    rule.innerHTML = tick + '<line x1="1" y1="4.5" x2="70" y2="4.5" stroke="' + ink + '" stroke-width="1.5"/>';
    one.classList.toggle('acc1', kind === 'current' && on);
    btn.setAttribute('aria-pressed', String(on));
    meter.dataset.state = on ? 'on' : 'off';
  }
  btn.addEventListener('click', function () { draw(meter.dataset.state !== 'on'); });
});

// ── Q1 measurement: how much INK actually changes between off and on ─────────
// The question is whether the two states are distinguishable, so the sheet reports a
// number instead of asserting one. A first version diffed serialised SVG markup and
// printed "1 of 2 rows differ" for all five options — a measurement that cannot tell
// the candidates apart is decoration, so this one sums the AREA of the marks that
// change, in px², from real geometry.
document.querySelectorAll('[data-measure="accent"]').forEach(function (hint) {
  var opt = hint.closest('.opt');
  var meters = opt.querySelectorAll('.mt-rm[data-state]');
  if (meters.length < 2) return;
  function ink(meter) {
    var total = 0;
    meter.querySelectorAll('line').forEach(function (ln) {
      var x1 = +ln.getAttribute('x1'), y1 = +ln.getAttribute('y1');
      var x2 = +ln.getAttribute('x2'), y2 = +ln.getAttribute('y2');
      var len = Math.hypot(x2 - x1, y2 - y1);
      total += len * (+ln.getAttribute('stroke-width') || 1);
    });
    return total;
  }
  var a = ink(meters[0]), b = ink(meters[1]);
  var delta = Math.abs(b - a);
  var weight = meters[0].querySelector('.rbtn').className !==
               meters[1].querySelector('.rbtn').className;
  // WHERE the change is, not just how much of it there is. Area alone would mislead:
  // option 01 changes the MOST px² of any option and is the hardest to see, because a
  // 3px stub growing in place below the digits is a big number in a bad location. A
  // measurement that ranks the candidates wrongly is worse than none, so the sentence
  // carries both facts and the position is stated first.
  var appears = ink(meters[0]) === 0 || !meters[0].querySelector('.rm-over line');
  var where = meters[1].querySelector('.rm-over line')
    ? (appears ? 'a mark <b>appears above</b> the digits'
               : 'a mark <b>above</b> the digits changes value')
    : 'a tick <b>below</b> the digits grows in place';
  var bits = [where, '<b>' + delta.toFixed(0) + ' px²</b> of ink moves'];
  if (weight) bits.push('the digit 1 changes <b>weight</b>');
  hint.innerHTML = 'Off &rarr; on: ' + bits.join(' &middot; ') + '.';
});

// ── Q2: each tap button runs ITS OWN mechanic ────────────────────────────────
// Per-option data-tap, one handler per button. Real tap-tempo averaging so option 04
// can flash on the strike that first yields a tempo — the same rule the page uses:
// ≥2 taps in a phrase, a >2s gap starts over.
document.querySelectorAll('[data-tap]').forEach(function (btn) {
  var kind = btn.dataset.tap;
  var taps = [];
  var trail = btn.parentElement.querySelector('.taptrail');
  var out = btn.parentElement.querySelector('.bpmout');
  var rip = btn.querySelector('.rip');
  var slot = 0;

  btn.addEventListener('pointerdown', function () {
    var now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    var bpm = null;
    if (taps.length >= 2) {
      var r = taps.slice(-6);
      var avg = (r[r.length - 1] - r[0]) / (r.length - 1);
      if (avg > 0) bpm = Math.round(60000 / avg);
    }

    if (kind === 'current' || kind === 'snap') {
      btn.classList.add('hit');
      setTimeout(function () { btn.classList.remove('hit'); }, kind === 'snap' ? 90 : 60);
    }
    if (kind === 'trail' && trail) {
      var dots = trail.querySelectorAll('i');
      var d = dots[slot % dots.length];
      slot++;
      // FORCED REFLOW, not requestAnimationFrame. rAF sets the transition and the
      // target value inside one frame, so the browser coalesces them and no
      // transition runs at all — measured, every dot read opacity 0 at 60ms and the
      // option rendered as a button with no feedback. Reading offsetWidth flushes
      // style so the opacity:1 with transition:none is committed before the 600ms
      // fade is armed. Same device as the `.rip` animation restart below.
      d.style.transition = 'none';
      d.style.opacity = '1';
      void d.offsetWidth;
      d.style.transition = 'opacity 1600ms linear';
      d.style.opacity = '0';
    }
    if (kind === 'ripple' && rip) {
      rip.classList.remove('go');
      void rip.offsetWidth;                      // restart the animation
      rip.classList.add('go');
    }
    if (kind === 'lock' && out) {
      out.querySelector('b').textContent = bpm === null ? '96' : String(bpm);
      if (bpm !== null) {
        out.classList.add('lock');
        setTimeout(function () { out.classList.remove('lock'); }, 40);
      }
    }
  });
});
</script>"""


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    html = HTML.format(
        plex400=font_b64("IBMPlexMono-Regular"),
        plex500=font_b64("IBMPlexMono-Medium"),
        css_opt=CSS_OPT,
        accent="\n".join(accent_option(o) for o in ACCENT),
        tap="\n".join(tap_option(o) for o in TAP),
        case="\n".join(case_option(o) for o in CASE),
        picker=paste("picker.html"),
        toggle=paste("theme-toggle.html"),
        wiring=WIRING,
    )
    out = os.path.join(OUT_DIR, "index.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"wrote {out} ({len(html) / 1024:.0f} KB; "
          f"{len(ACCENT)}+{len(TAP)}+{len(CASE)} options)")


if __name__ == "__main__":
    main()
