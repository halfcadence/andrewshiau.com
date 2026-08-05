#!/usr/bin/env python3
"""Generate the metrotuner scrub-target chooser into work/understand/.

    python3 scripts/build-scrub-chooser.py

Why a generator and not a hand-written HTML file: the sheet must be ONE self-contained
file openable over `file://`, which means the two IBM Plex woff2 faces are base64'd
inline (~130 KB of it). That is not something to hand-maintain, and the /proofs rule is
that a chooser using invented tokens lies — so the tokens, the type ramp and the control
markup are lifted from the real page and pasted in one place here.

The chooser doc is SCRATCH: it is written outside the repo tree, into
work/understand/metrotuner-scrub-target/, and is not committed. This generator is
committed, so the sheet can be regenerated after the pick is implemented.
"""
import base64
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.expanduser("~/workplace/work/understand/metrotuner-scrub-target")
SKILL = os.path.expanduser("~/workplace/work/skills/proofs")


def font_b64(name: str) -> str:
    with open(os.path.join(REPO, "public", "fonts", f"{name}.woff2"), "rb") as fh:
        return base64.b64encode(fh.read()).decode("ascii")


def paste(fname: str) -> str:
    """Read a /proofs block verbatim. Its leading HTML comment is stripped: the block's
    own documentation is for whoever pastes it, not for the reader of the sheet."""
    with open(os.path.join(SKILL, fname), encoding="utf-8") as fh:
        src = fh.read()
    return re.sub(r"^\s*<!--.*?-->\s*", "", src, count=1, flags=re.S)


# ── the options ───────────────────────────────────────────────────────────────
# Each is a real, independently operable control. `kind` selects the wiring in the
# inlined script; nothing branches on the option's number.
#
# The axis: WHAT SURFACE HOLDS THE DRAG. Today it is the whole control including the
# <input>, which is the thing the user called confusing — the same pixels both accept a
# drag and open a keyboard. Figma's answer is that the label/unit is the scrub handle and
# the field is only for typing.
OPTIONS = [
    dict(
        n="01", name="Current — the whole control scrubs",
        why="Live today. The wrapper takes the drag, so the digits scrub AND accept typing. "
            "One 6ch target, but the gesture and the caret share pixels: a slow drag that "
            "starts on the numeral looks like a click into a text field.",
        kind="whole", label_scrub=False, input_scrub=True, unit_scrub=True,
        cost="The confusion being fixed. Nothing signals which pixels do which.",
    ),
    dict(
        n="02", name="Unit only (Figma)",
        why="The drag moves to the <b>unit</b> — <i>bpm</i> / <i>Hz</i> — and to <i>A4</i>. "
            "The field does one thing: type. This is the ask, and Figma's model: the label "
            "beside a field is the scrubber.",
        kind="unit", label_scrub=True, input_scrub=False, unit_scrub=True,
        cost="Target shrinks to 2–3ch (~24px). Under WCAG's 24px floor at 'bpm', below the "
             "44px this page uses everywhere else.",
    ),
    dict(
        n="03", name="Unit only, with a padded target",
        why="Same split as 02, but the unit carries invisible padding to a real 44px tap "
            "target — the same trick <code>.pgword</code> already uses on the page words.",
        kind="unit", label_scrub=True, input_scrub=False, unit_scrub=True, pad=True,
        cost="The 44px box is invisible, so the hit area is bigger than the ink. Two "
             "adjacent controls need spacing checked.",
    ),
    dict(
        n="04", name="Unit scrubs, unit is underlined",
        why="Same split as 03, plus the unit is <b>marked</b>: a dotted underline says "
            "'this word is a handle'. The affordance stops depending on a hover cursor, "
            "which is what touch never gets.",
        kind="unit", label_scrub=True, input_scrub=False, unit_scrub=True, pad=True,
        mark="dotted",
        cost="Adds a mark to a page that draws structure with rules, not decoration. "
             "A dotted line under a word is close to the site's link idiom.",
    ),
    dict(
        n="05", name="Field typing-only, unit AND digits scrub",
        why="A halfway house: the unit scrubs, and so do the digits — but the field is "
            "<code>readonly</code> until you click the unit's sibling caret. Keeps the big "
            "target, removes the ambiguity by making typing the deliberate act.",
        kind="hybrid", label_scrub=True, input_scrub=True, unit_scrub=True, pad=True,
        cost="A mode. The reader must discover that a click somewhere else unlocks typing, "
             "and modes are what this instrument's grammar was built to avoid.",
    ),
]

CSS_OPT = """
  /* ── the real page's control markup, verbatim in behaviour ───────────────── */
  /* SOURCE ORDER MATTERS AND IT BIT ONCE. `.f` and `.mt-bpm` are both single-class
     selectors, so specificity is tied and the LATER one wins. On the real site `.f`
     lives in global.css and `.mt-bpm` in the page's scoped <style>, so
     `align-items:center` wins. A first draft of this sheet pasted them the other way
     round: `.f{align-items:stretch}` stretched the unit label to the input's 45px, so
     option 01 measured 27x45 where the live page measures 27x28 — the chooser's own
     baseline was wrong, which is the "chooser that lies" failure the skill warns about.
     Caught by measuring the live page and comparing, not by looking at the sheet. */
  .f{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
  .f input{font:inherit;font-size:16px;color:var(--ink);background:transparent;
    border:0;border-bottom:1px solid var(--ink);padding:8px 0;min-height:44px;
    min-width:0;border-radius:0;transition:border-color var(--dur-fast) var(--ease)}
  .f input:focus{outline:0;border-bottom-color:var(--accent)}
  /* the page's scoped block, which comes after global.css — hence after .f here */
  .mt-lb{color:var(--faint)}
  .mt-a4,.mt-bpm{display:inline-flex;align-items:center;gap:1ch}
  .mt-a4 input,.mt-bpm input{flex:0 0 auto;width:6ch;text-align:center;
    -moz-appearance:textfield;appearance:textfield}
  .mt-a4 input::-webkit-outer-spin-button,.mt-a4 input::-webkit-inner-spin-button,
  .mt-bpm input::-webkit-outer-spin-button,.mt-bpm input::-webkit-inner-spin-button{
    -webkit-appearance:none;margin:0}
  /* the accent digits while a scrub is live — the page's own feedback */
  .scrubbing input,.scrubbing .mt-lb.hot{color:var(--accent)}

  /* WHAT EACH OPTION MAKES DRAGGABLE. Attribute selectors, one per surface, so the
     cursor always tells the truth about where the gesture is wired. */
  [data-scrub-input="1"] input{cursor:ew-resize}
  [data-scrub-unit="1"] .mt-lb{cursor:ew-resize;touch-action:none}
  [data-scrub-input="0"] input{cursor:text}
  /* the padded 44px target, same device as .pgword on the real page */
  [data-pad="1"] .mt-lb{padding:14px 2px;margin:-14px -2px;display:inline-block}
  /* option 04's mark */
  [data-mark="dotted"] .mt-lb{text-decoration:underline dotted;
    text-decoration-color:var(--faint);text-underline-offset:4px}
  /* option 05: readonly until unlocked */
  input[readonly]{color:var(--dim);border-bottom-style:dashed}
  .caret{font:inherit;background:none;border:0;padding:10px 4px;margin:-10px 0;
    color:var(--faint);cursor:pointer;text-decoration:underline;
    text-decoration-color:var(--line);text-underline-offset:4px}
  .caret:hover{color:var(--accent)}

  /* the measured target width, printed under each option — a number the reader can
     check against the 24px WCAG floor and the page's own 44px habit */
  .tgt{margin-top:var(--tight);color:var(--dim);font-size:13px}
  .tgt b{color:var(--ink);font-weight:500}
  .tgt.bad b{color:var(--accent)}
"""


def option_html(o: dict) -> str:
    attrs = (
        f'data-kind="{o["kind"]}" '
        f'data-scrub-input="{1 if o["input_scrub"] else 0}" '
        f'data-scrub-unit="{1 if o["unit_scrub"] else 0}"'
    )
    if o.get("pad"):
        attrs += ' data-pad="1"'
    if o.get("mark"):
        attrs += f' data-mark="{o["mark"]}"'

    readonly = " readonly" if o["kind"] == "hybrid" else ""
    caret = (
        '<button type="button" class="caret" data-unlock="1">type</button>'
        if o["kind"] == "hybrid" else ""
    )

    return f"""
      <div class="opt">
        <div class="ohd">
          <span class="on">{o['n']}</span>
          <span class="om">{o['name']}</span>
          <span class="owhy">{o['why']}</span>
        </div>
        <div class="orender" {attrs}>
          <div class="rrow">
            <span class="f mt-bpm scrubhost" title="{o['n']}">
              <input type="number" inputmode="numeric" min="20" max="320" step="1"
                     value="96" aria-label="Beats per minute"{readonly} />
              <span class="mt-lb" data-unit="bpm">bpm</span>
            </span>
            {caret}
          </div>
          <div class="rrow">
            <span class="f mt-a4 scrubhost" title="{o['n']}">
              <span class="mt-lb" data-unit="a4">A4</span>
              <input type="number" inputmode="decimal" min="400" max="480" step="1"
                     value="440" aria-label="A4 calibration in hertz"{readonly} />
              <span class="mt-lb" data-unit="hz">Hz</span>
            </span>
            {caret}
          </div>
          <div class="tgt"></div>
        </div>
        <div class="ocost"><span class="ck">Costs</span>{o['cost']}</div>
      </div>"""


HTML = """<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Practice room — which surface holds the scrub gesture</title>
<style>
  @font-face{{font-family:Plex;font-weight:400;font-display:block;
    src:url(data:font/woff2;base64,{plex400}) format('woff2')}}
  @font-face{{font-family:Plex;font-weight:500;font-display:block;
    src:url(data:font/woff2;base64,{plex500}) format('woff2')}}

  /* ── THE REAL TOKENS, from src/styles/global.css. Emitted TWICE from one source
       (see theme-toggle's CSS contract) so an explicit Light pick beats an OS set
       to dark. ─────────────────────────────────────────────────────────────── */
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

  .sect{{margin-bottom:var(--sect)}}
  .sect > h2{{border-top:2px solid var(--ink);padding-top:var(--tight);
    margin-bottom:var(--lead)}}
  .opt{{padding-top:var(--lead);border-top:1px solid var(--line);margin-bottom:var(--group)}}
  .ohd{{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 1ch}}
  .on{{color:var(--accent);flex:none}}
  .om{{font-weight:500;flex:none}}
  .owhy{{flex:1 1 100%;color:var(--dim)}}
  .orender{{margin:var(--lead) 0 0;padding:var(--lead) 0}}
  .rrow{{display:flex;align-items:center;gap:2ch;margin-bottom:var(--tight)}}
  .ocost{{color:var(--dim);max-width:64ch}}
{css_opt}
</style>
<body>
<div class="wrap">
  <p class="kick">/metrotuner/ · control grammar</p>
  <h1 class="lede">Which surface holds the scrub gesture — and does the typing field
    keep it?</h1>

  <p>Every control below is <b>live</b>: drag it, type in it, watch the digits. The
  numbers are the real ranges (bpm 20–320, A4 400–480) at the real rate of
  <b>1 unit per 4px</b>.</p>

  <p><b>The constraint the answer has to satisfy.</b> This page already puts a
  <b>44px</b> minimum on every tap target — the <code>.f input</code> rule carries
  <code>min-height:44px</code> specifically because at 390px the control row wraps and
  the field fell to 42px. WCAG 2.5.8 floors a target at 24px. The word <i>bpm</i> is
  3 characters, and in this monospace face that is about <b>27px</b> wide and 28px tall.
  So moving the gesture onto the unit trades an unambiguous handle for a target near
  the legal floor, unless it is padded. Each option prints its own measured target.</p>

  <p>It applies in <b>three</b> places: bpm, A4, and Hz. The reference-note button is
  already a separate control with its own vertical drag and is out of scope.</p>

  <div class="sect" data-name="Scrub target">
    <h2>The options</h2>
{options}
    <div class="opt"><div class="ohd"><span class="om">Click an option's header to pick
      it — the sheet copies your choice itself.</span></div></div>
  </div>
</div>

{picker}
{toggle}

{wiring}
</body>
</html>
"""

WIRING = r"""<script>
// ── PER-OPTION WIRING ────────────────────────────────────────────────────────
// One handler is attached per rendered control, and it reads that control's OWN
// data- attributes. Nothing asks "which option number am I" — the coupling bug this
// sheet exists to choose a way out of must not live inside the instrument.
document.querySelectorAll('.orender').forEach(function (host) {
  var kind = host.dataset.kind;
  var unitScrubs = host.dataset.scrubUnit === '1';
  var inputScrubs = host.dataset.scrubInput === '1';

  host.querySelectorAll('.scrubhost').forEach(function (ctl) {
    var input = ctl.querySelector('input');
    var min = Number(input.min), max = Number(input.max);
    // The surfaces that accept a drag, per THIS option.
    var handles = [];
    if (unitScrubs) handles = handles.concat([].slice.call(ctl.querySelectorAll('.mt-lb')));
    if (inputScrubs) handles.push(input);

    handles.forEach(function (h) {
      var dragX = null, start = 0, moved = false;
      h.addEventListener('pointerdown', function (e) {
        dragX = e.clientX; start = Number(input.value); moved = false;
        ctl.classList.add('scrubbing');
        if (h.classList.contains('mt-lb')) h.classList.add('hot');
        h.setPointerCapture(e.pointerId);
      });
      h.addEventListener('pointermove', function (e) {
        if (dragX === null) return;
        var d = Math.round((e.clientX - dragX) / 4);
        if (d !== 0) moved = true;
        input.value = String(Math.min(max, Math.max(min, start + d)));
      });
      h.addEventListener('pointerup', function () {
        dragX = null;
        ctl.classList.remove('scrubbing');
        h.classList.remove('hot');
      });
      // after a real drag, don't let the click focus the field (that pops the
      // keyboard on touch mid-scrub) — the live page's own rule
      h.addEventListener('click', function (e) {
        if (moved) { moved = false; e.preventDefault(); input.blur(); }
      }, true);
    });
  });

  // option 05's mode: the field is readonly until "type" is pressed
  if (kind === 'hybrid') {
    host.querySelectorAll('[data-unlock]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.closest('.rrow').querySelector('input');
        input.readOnly = false;
        input.focus();
        input.select();
      });
    });
  }

  // PRINT THE MEASURED TARGET. The trade-off in this decision is a size, so the
  // sheet measures it rather than asserting it — and flags anything under 24px.
  var out = host.querySelector('.tgt');
  var probe = host.querySelector('.mt-lb[data-unit="bpm"]');
  var box = probe.getBoundingClientRect();
  var w = Math.round(box.width), h = Math.round(box.height);
  var surface = [];
  if (unitScrubs) surface.push('the unit');
  if (inputScrubs) surface.push('the digits');
  var under24 = w < 24 || h < 24;
  out.className = 'tgt' + (under24 ? ' bad' : '');
  out.innerHTML = 'Drag surface: <b>' + surface.join(' + ') + '</b>. ' +
    'The <i>bpm</i> handle measures <b>' + w + '×' + h + 'px</b>' +
    (under24 ? ' — under the 24px floor.' : '.');
});
</script>"""


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    html = HTML.format(
        plex400=font_b64("IBMPlexMono-Regular"),
        plex500=font_b64("IBMPlexMono-Medium"),
        css_opt=CSS_OPT,
        options="\n".join(option_html(o) for o in OPTIONS),
        picker=paste("picker.html"),
        toggle=paste("theme-toggle.html"),
        wiring=WIRING,
    )
    out = os.path.join(OUT_DIR, "index.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"wrote {out} ({len(html) / 1024:.0f} KB, {len(OPTIONS)} options)")


if __name__ == "__main__":
    main()
