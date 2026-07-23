// The experiment index. The landing page renders this list; each entry with a
// `href` starting with /work/ has its own case-study page.
export interface Experiment {
  n: string;          // set number, e.g. "01"
  title: string;
  blurb: string;
  meta: string;       // small caps status line
  href: string;       // where the entry links
  pos: string;        // matrix placement class (pos-01 …) for the calendar scatter
  accent?: boolean;   // red top-rule instead of ink
  external?: boolean; // opens in a new tab
}

export const experiments: Experiment[] = [
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
