// Two indexes the landing page renders as separate sections:
//   work        — professional projects (pre-AI + shipped-at-work), each a case study
//   experiments — the AI-forward experiments
// Each entry with an internal `href` (/work/…) has its own case-study page.
export interface Entry {
  n: string;          // set number, e.g. "01"
  title: string;
  blurb: string;
  // Small-caps meta line: the ARTIFACT TYPE, 1–3 words. One question answered the same
  // way every time, so the eight entries read as a single column of nouns. No employer
  // (that's in the blurb), no discipline (that's what the side marker is for), no date —
  // any of those made the string long enough to wrap in a 4-column cell.
  meta: string;
  href: string;       // where the entry links
  side: Side;         // which half of the practice — renders the dot + word marker
  accent?: boolean;   // accent (design-hue) top-rule instead of ink
  external?: boolean; // opens in a new tab
}

// Which half of the practice an entry belongs to. Drives the side marker (a dot in
// the duality hue + the WORD — colour is never the only signal). 'both' is a
// half-and-half dot; use it only when the work genuinely spanned design AND build.
export type Side = 'design' | 'build' | 'both';

export const SIDE_LABEL: Record<Side, string> = {
  design: 'Design',
  build: 'Build',
  both: 'Design + Build',
};

// A case-study page asks for its own side by href, so the marker on the page and
// the marker in the index can never drift apart. Throws loudly on a typo'd href
// rather than silently rendering the wrong half.
export function sideOf(href: string): Side {
  const entry = [...work, ...experiments].find((x) => x.href === href);
  if (!entry) throw new Error(`sideOf: no entry with href "${href}" in experiments.ts`);
  return entry.side;
}

// PROFESSIONAL WORK — real projects, engineering + design. Pre-AI and at-work.
export const work: Entry[] = [
  {
    n: '01',
    title: 'Stores Designer',
    blurb:
      'A design-system tool at Amazon that lets distributed teams build ' +
      'consistent shopping experiences without hand-coding each one.',
    meta: 'Design system tool',
    href: '/work/stores-designer/',
    side: 'both',
    accent: true,
  },
  {
    n: '02',
    title: 'Luthier',
    blurb:
      'Invented a no-code graphics-automation process at Amazon scale: a Figma ' +
      'widget that turns a design into a production template, no engineer required.',
    meta: 'Figma widget',
    href: '/work/luthier/',
    side: 'both',
  },
  {
    n: '03',
    title: 'Powerpoint Pen Toolbox',
    blurb:
      "Redesigned PowerPoint's inking toolbox through 20+ rounds of functional " +
      'prototyping and user tests — the data refuted the team’s first design.',
    meta: 'Prototype study',
    href: '/work/powerpoint/',
    side: 'design',
  },
];

// AI-FORWARD EXPERIMENTS.
export const experiments: Entry[] = [
  {
    n: '01',
    title: 'Recipes',
    blurb:
      '124 recipes and cooking essays — filed like a reference manual, not a blog. ' +
      'An agent files each entry against a fixed style guide; I do the cooking.',
    meta: 'Static site',
    href: '/work/recipes/',
    side: 'build',
    accent: true,
  },
  {
    n: '02',
    title: 'Aping',
    blurb:
      "An agent skill that writes in the Swiss style — Müller-Brockmann's grid. " +
      'It built this site.',
    meta: 'Agent skill',
    href: '/work/aping/',
    side: 'both',
  },
  {
    n: '03',
    title: 'Explain',
    blurb:
      'A skill that turns something I figured out into an interactive explainer — ' +
      'a diagram and a quiz that check the idea landed.',
    meta: 'Agent skill',
    href: '/work/explain/',
    side: 'build',
  },
  {
    n: '04',
    title: 'Proofs',
    blurb:
      'A skill that renders every design option side by side, in the real system, ' +
      'so you pick by looking instead of imagining.',
    meta: 'Agent skill',
    href: '/work/proofs/',
    side: 'design',
  },
  {
    n: '05',
    title: 'Photography',
    blurb:
      'Shot with iPhones, a Fuji X100, and a Leica Q.',
    meta: 'Photographs',
    href: '/work/photography/',
    side: 'design',
  },
];
