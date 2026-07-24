// Two indexes the landing page renders as separate sections:
//   work        — professional projects (pre-AI + shipped-at-work), each a case study
//   experiments — the AI-forward experiments
// Each entry with an internal `href` (/work/…) has its own case-study page.
export interface Entry {
  n: string;          // set number, e.g. "01"
  title: string;
  blurb: string;
  meta: string;       // small caps status line
  href: string;       // where the entry links
  pos: string;        // matrix placement class (pos-01 …) for the calendar scatter
  accent?: boolean;   // red top-rule instead of ink
  external?: boolean; // opens in a new tab
}

// PROFESSIONAL WORK — real projects, engineering + design. Pre-AI and at-work.
export const work: Entry[] = [
  {
    n: '01',
    title: 'Stores Designer',
    blurb:
      'A design-system tool at Amazon that lets distributed teams build ' +
      'consistent shopping experiences — the through-line from Luthier.',
    meta: 'At Amazon · 2023–now',
    href: '/work/stores-designer/',
    pos: 'pos-01',
    accent: true,
  },
  {
    n: '02',
    title: 'Luthier',
    blurb:
      'Invented a no-code graphics-automation process at Amazon scale: a Figma ' +
      'widget that turns a design into a production template, no engineer required.',
    meta: 'At Amazon · full-stack + UX',
    href: '/work/luthier/',
    pos: 'pos-02',
  },
  {
    n: '03',
    title: 'Powerpoint Pen Toolbox',
    blurb:
      "Redesigned PowerPoint's inking toolbox through 20+ rounds of functional " +
      'prototyping and user tests — the data refuted the team’s first design.',
    meta: 'Rapid prototyping · UX',
    href: '/work/powerpoint/',
    pos: 'pos-03',
  },
  {
    n: '04',
    title: 'Photography',
    blurb:
      'Shot with iPhones, a Fuji X100, and a Leica Q.',
    meta: 'Personal · ongoing',
    href: '/work/photography/',
    pos: 'pos-04',
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
    meta: 'Static site · ongoing',
    href: '/work/recipes/',
    pos: 'pos-01',
    accent: true,
  },
  {
    n: '02',
    title: 'Aping',
    blurb:
      "An agent skill that writes in the Swiss style — Müller-Brockmann's grid. " +
      'It built this site.',
    meta: 'Agent skill · 2026',
    href: '/work/aping/',
    pos: 'pos-02',
  },
  {
    n: '03',
    title: 'Explain',
    blurb:
      'A skill that turns something I figured out into an interactive explainer — ' +
      'a diagram and a quiz that check the idea landed.',
    meta: 'Agent skill · 2026',
    href: '/work/explain/',
    pos: 'pos-03',
  },
  {
    n: '04',
    title: 'Proofs',
    blurb:
      'A skill that renders every design option side by side, in the real system, ' +
      'so you pick by looking instead of imagining.',
    meta: 'Agent skill · 2026',
    href: '/work/proofs/',
    pos: 'pos-04',
  },
];
