// Three indexes the landing page renders as separate sections, in this order:
//   method      — the spec the other two came out of (one entry)
//   work        — professional projects (pre-AI + shipped-at-work), each a case study
//   experiments — the AI-forward experiments
// Each entry with an internal `href` (/work/…, /method/) has its own page.
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
  // The page is behind the password gate, so the row says so BEFORE the click — a lock at the
  // title and the word in the marker cell. Without it a hiring manager reads the first row of
  // Work as a broken link rather than a deliberate gate.
  // The flag does three things, which is why it is here rather than hardcoded in a page: it
  // renders the row as `LockedRow.astro` (the gate opens under it in place), it is what
  // `gate.astro` looks up to know which row to render open, and it sits next to the href the
  // vhost protects so the two can't drift. Setting it is not what protects the page — nginx is
  // (README.md, "the password gate"). Both, or neither is true.
  locked?: boolean;
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
  const entry = [methodSpec, ...work, ...experiments].find((x) => x.href === href);
  if (!entry) throw new Error(`sideOf: no entry with href "${href}" in experiments.ts`);
  return entry.side;
}

// Same contract for `meta`, and for the same reason. Every case-study page's pinned panel
// opens its ledger with a Type row, and this is where that string comes from — so the
// artifact type a reader saw in the index is the one the page repeats, character for
// character, or the build fails. (Chooser round 2, Q3/02: "src/data/experiments.ts — a
// facts field".) It is the one ledger row all eight panels share: Type A adds role and
// span beneath it, Type C adds a count, and Type B has only this, because a skill's other
// facts are its colophon and a colophon is read after the work, not before it.
export function metaOf(href: string): string {
  const entry = [methodSpec, ...work, ...experiments].find((x) => x.href === href);
  if (!entry) throw new Error(`metaOf: no entry with href "${href}" in experiments.ts`);
  return entry.meta;
}

// THE METHOD — the spec, not a project, and deliberately NOT an `Entry`. It gets
// the index's row device (see `.espec`) with two differences the data has to carry:
//   no `n` — there is exactly one of it, and a set "01" promises an "02" that never comes;
//   two procedures instead of one blurb — the duality is the row's content, so it is two
//   sub-rows in the two hues rather than a sentence describing them.
// Its own one-row section at the top of the index: the two sentences under the masthead are
// this spec's opening claim, so the thing that states them belongs above the evidence.
export interface Procedure {
  side: 'design' | 'build'; // which hue opens the sub-row
  label: string;            // the kicker, in that hue
  title: string;
  blurb: string;
}

export interface SpecRow {
  title: string;
  meta: string;
  href: string;
  side: Side;
  procedures: Procedure[];
}

export const methodSpec: SpecRow = {
  // "Simple design technology", not "The operating spec" (annotation: "can we retitle this like
  // 'Simple design technology' in the skill and title here"). The old title named the FORM of the
  // thing — it's a spec, and it operates — which is the least interesting fact about it and reads
  // like a filing category. The new one names the subject: what the two procedures are for.
  // Renamed everywhere the string appears, not just here: method.md's own H1, the /method/ page
  // title, and the cross-references in POINTER.md / README.md / INSTALL.md. A title that differs
  // between the index row, the page and the file is three names for one artifact.
  title: 'Simple design technology',
  meta: 'Agent spec',
  href: '/method/',
  side: 'both',
  procedures: [
    {
      side: 'design',
      label: 'Design',
      title: 'How a decision gets made',
      blurb:
        "Render every option in the real system, option 1 is what's live, pick by " +
        'looking — then state the reason.',
    },
    {
      side: 'build',
      label: 'Build',
      title: 'How a change gets proven',
      blurb:
        'On the real deployment, verified in the live artifact, always paired with a ' +
        'control.',
    },
  ],
};

// PROFESSIONAL WORK — real projects, engineering + design. Pre-AI and at-work.
export const work: Entry[] = [
  {
    n: '01',
    title: 'Stores Designer',
    blurb:
      'A design-system tool at Amazon that lets many teams build one shopping ' +
      'surface without hand-coding each page.',
    meta: 'Design system tool',
    href: '/work/stores-designer/',
    side: 'both',
    accent: true,
    locked: true,
  },
  {
    n: '02',
    title: 'Luthier',
    blurb:
      'A Figma widget that turns a designer’s document into a production ' +
      'template, for a pipeline that makes 50,000 marketing images a year.',
    meta: 'Figma widget',
    href: '/work/luthier/',
    side: 'both',
  },
  {
    n: '03',
    title: 'PowerPoint Pen Toolbox',
    blurb:
      "Redesigned PowerPoint's inking toolbox through 20-plus working prototypes " +
      'and an A/B test that ruled out the design the team favoured.',
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
      '124 recipes and 20 technique essays. An agent files each entry against a ' +
      'committed style guide; I do the cooking.',
    meta: 'Static site',
    href: '/work/recipes/',
    // `both`, not `build` (annotation: "this is design and build"). The archive is a static
    // site an agent files into, which is why this said build — but the thing a reader sees is
    // a typeset reference manual: numbered sections, one set of measures, own CSS and no
    // theme. The layout was decided by looking, over a chooser sheet that is embedded on
    // /work/proofs/. Deciding how a page is set is the design half by definition.
    side: 'both',
    accent: true,
  },
  {
    n: '02',
    title: 'Aping',
    blurb:
      "An agent skill that sets HTML on Müller-Brockmann's grid. It built this site.",
    meta: 'Agent skill',
    href: '/work/aping/',
    // `design`, not `both` (annotation: "this is mostly design"). The skill is a markdown
    // file — there is no build here beyond the agent reading it. What the file contains is a
    // type ramp, a grid, a palette and a set of rules about restraint, which is a design
    // system written down. It sat on `both` because the output is HTML; the output being code
    // isn't the same as the work being engineering.
    side: 'design',
  },
  {
    n: '03',
    title: 'Explain',
    blurb:
      'A skill that turns something I worked out into one HTML explainer with a ' +
      'diagram and a quiz. Three of them are on this site.',
    meta: 'Agent skill',
    href: '/work/explain/',
    // `both`, not `build` (annotation: "this is design and code"). It writes the explainer AND
    // sets it: the diagram, the type, and the quiz's interaction are design decisions, and the
    // quiz engine and the hosting are engineering. Neither half is the junior partner, which
    // is the test for `both`.
    side: 'both',
  },
  {
    n: '04',
    title: 'Proofs',
    blurb:
      'A skill that renders every design option side by side in the real system. ' +
      'Three sheets from this site and my recipe archive are embedded live.',
    meta: 'Agent skill',
    href: '/work/proofs/',
    // `both`, not `design` (annotation: "this is design and code"). The purpose is a design
    // decision — render every option in the real system and pick by looking — but the sheet
    // has to BUILD each option at its real width in the live stylesheet, which is the whole
    // reason it beats a mockup. The instrument is the eye; the apparatus is code.
    side: 'both',
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
