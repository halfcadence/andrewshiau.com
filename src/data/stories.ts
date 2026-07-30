// ── THE LP MAPPING, and the reason this file exists at all.
//
// `/stories/` renders `work/growth/star-stories.md`, which lives OUTSIDE this repo. That is
// deliberate and it is the whole security model of the page: this repo is public on GitHub
// (verified — an unauthenticated GET on github.com/halfcadence/andrewshiau.com returns 200), so a
// page gated by nginx whose SOURCE is committed here would be gated in name only. Anyone could read
// the markdown in the repo and never touch the URL. The file stays in `work/`, the build reads it
// from disk at build time, and only the rendered HTML — which nginx gates — reaches the droplet.
//
// The consequence, stated because it is a real cost: THIS REPO NO LONGER BUILDS STANDALONE. A clone
// without a sibling `work/` checkout fails at `astro build`. `/style/` imports `../../STYLE.md`,
// which is committed, so it has no such constraint; this page trades that away for the gate meaning
// something. The build throws a named error rather than emitting an empty page — see stories.astro.
//
// WHY A SEPARATE MAPPING FILE rather than LP tags in the markdown itself: `star-stories.md` is
// scrubbed to the transferable-competency level on purpose — its own rule is "describe the skill I
// now own, not my employer's business", and it is portable to any interview at any company. Putting
// Amazon's Leadership Principles into that file would couple a deliberately employer-agnostic
// document to one employer's rubric, and the next non-Amazon loop would need it stripped back out.
// So the story text stays neutral and the LENS lives here. Same story set, swap the lens.
//
// The LP names themselves are public Amazon information (amazon.jobs publishes all sixteen), so
// naming them here leaks nothing. What would leak is the level-calibration language in
// `work/growth/story-bank.md` — "L6 ANCHOR", "hardest L6 competency", promo-panel targets — and
// that file is NOT the source of this page. It fails `scrub-check.sh` and stays local.
//
// The mapping is taken from the internal bank's own tags where it has them, so the two agree.

export interface LpGroup {
  lp: string;          // the Leadership Principle, as Amazon words it
  gist: string;        // one line: what this principle asks for, in my words
  stories: number[];   // 1-indexed into star-stories.md's `## N ·` headings
}

// ── THE FIVE, not all sixteen. A page that maps to every LP is a page that claims everything,
// which reads as a checklist rather than a practice. These are the five the thirteen stories
// actually carry evidence for, in the order the bank's own tag counts put them: Ownership (11
// mentions), Deliver Results (9), Earn Trust (8), Dive Deep (7), Invent and Simplify.
// A principle with one thin story is worse than a principle absent — so the gaps are named at the
// foot of the page rather than padded.
export const LP_MAP: LpGroup[] = [
  {
    lp: 'Ownership',
    gist: 'Picked up the thing nobody owned, and kept owning it past the point it was my job.',
    stories: [3, 1, 13],
  },
  {
    lp: 'Dive Deep',
    gist: 'Asked whether three bugs were one bug before writing three fixes.',
    stories: [2, 5, 12, 10],
  },
  {
    lp: 'Invent and Simplify',
    gist: 'Built the thing that removes the work, not the thing that does the work faster.',
    stories: [8, 6, 1],
  },
  {
    lp: 'Earn Trust',
    gist: 'Proved the change was safe before shipping it, and published the gap instead of padding it.',
    stories: [9, 11, 4],
  },
  {
    lp: 'Deliver Results',
    gist: 'Shipped under a deadline and during an escalation, with the judgment calls stated.',
    stories: [7, 12, 9],
  },
];

// ── WHAT IS NOT CLAIMED. Named on the page, because a coverage map with silent gaps is a map that
// lies by omission — and the gaps are the useful part when the reader is me, reviewing.
export const LP_GAPS = [
  {
    lp: 'Hire and Develop the Best',
    why: 'No evidence. I have not hired, and mentoring has not been a formal part of a role yet — ' +
      'the closest is #13, enabling another org rather than developing an individual.',
  },
  {
    lp: 'Think Big',
    why: 'Thin. #1 is the closest — a platform play rather than a feature — but the framing was ' +
      'de-risk-and-decouple, not a bet on a much larger outcome.',
  },
  {
    lp: 'Frugality',
    why: 'One story touches it (#8, a multi-week manual process becoming a shared asset) and it is ' +
      'told as leverage, not cost. Real but not the strongest reading of that work.',
  },
];
