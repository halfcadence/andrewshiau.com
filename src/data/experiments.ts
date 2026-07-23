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
    title: 'Aping',
    blurb:
      'An agent skill that writes in the Swiss style — Müller-Brockmann’s grid. ' +
      'It built this site.',
    meta: 'Agent skill · 2026',
    href: '/work/aping/',
    pos: 'pos-01',
    accent: true,
  },
  {
    n: '02',
    title: 'Recipes',
    blurb:
      '124 recipes, kept in order by an agent against a fixed style guide. ' +
      'Jekyll, no theme.',
    meta: 'Static site · ongoing',
    href: '/work/recipes/',
    pos: 'pos-02',
  },
];
