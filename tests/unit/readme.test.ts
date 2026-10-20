// README.md states the devDependency count; derived here so it can't go stale silently, which
// it did once (8/3/five against a tree holding 10/4/7).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
};
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : WORDS[s.toLowerCase()]);

describe('README counts match the tree', () => {
  it('devDependency count = package.json', () => {
    const m = readme.match(/the (\w+)\s+devDependencies/);
    expect(m, 'README names the devDependency count').toBeTruthy();
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(num(m![1])).toBe(Object.keys(pkg.devDependencies).length);
  });
});
