// The experiment index. The landing page renders this list; each entry with a
// `href` starting with /work/ has its own case-study page.
export interface Experiment {
  n: string;          // set number, e.g. "01"
  title: string;
  blurb: string;
  meta: string;       // right-column label (medium / status)
  href: string;       // where the entry links
  external?: boolean; // opens in a new tab
}

export const experiments: Experiment[] = [
  {
    n: '01',
    title: 'Aping the modernists',
    blurb:
      'A set of agent skills that generate documents in the voice of the Swiss ' +
      'typographers — Müller-Brockmann and Experimental Jetset. This very site ' +
      'is one of their outputs.',
    meta: 'Agent skills · 2026',
    href: '/work/aping/',
  },
  {
    n: '02',
    title: 'A recipe system',
    blurb:
      'A hand-built, agent-maintained collection of 120+ recipes and cooking ' +
      'essays — Jekyll, self-owned CSS, system Helvetica. Precision cooking as a ' +
      'design object.',
    meta: 'Static site · ongoing',
    href: '/work/recipes/',
  },
];
