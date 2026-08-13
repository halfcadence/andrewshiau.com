// README.md states counts the tree can derive — page tallies, the devDependency count, the
// size of style.astro's renderer. Derived here from the filesystem, so the README cannot go
// stale silently: it did (8/3/five against a tree holding 10/4/7), which is why this exists.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
};
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : WORDS[s.toLowerCase()]);

const astroCount = (dir: string) =>
  readdirSync(join(ROOT, 'src', 'pages', dir)).filter((f) => f.endsWith('.astro')).length;

describe('README counts match the tree', () => {
  it('case studies = ls src/pages/work/*.astro', () => {
    const m = readme.match(/work\/\*\.astro\s+(\w+) case studies/);
    expect(m, 'README names a work/*.astro count').toBeTruthy();
    expect(num(m![1])).toBe(astroCount('work'));
  });

  it('explainers = ls src/pages/writing/*.astro', () => {
    const m = readme.match(/writing\/\*\.astro\s+(\w+) explainers/);
    expect(m, 'README names a writing/*.astro count').toBeTruthy();
    expect(num(m![1])).toBe(astroCount('writing'));
  });

  it('devDependency count = package.json', () => {
    const m = readme.match(/the (\w+)\s+devDependencies/);
    expect(m, 'README names the devDependency count').toBeTruthy();
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(num(m![1])).toBe(Object.keys(pkg.devDependencies).length);
  });

  it("renderer line-count claim agrees with style.astro's own", () => {
    const m = readme.match(/~(\d+)-line/);
    expect(m, 'README states the renderer size as ~N-line').toBeTruthy();
    const style = readFileSync(join(ROOT, 'src', 'pages', 'style.astro'), 'utf8');
    const s = style.match(/~(\d+) lines/);
    expect(s, 'style.astro states its renderer size as ~N lines').toBeTruthy();
    expect(Number(m![1]), 'two files, one renderer, one number').toBe(Number(s![1]));
  });
});
