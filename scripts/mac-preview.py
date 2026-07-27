#!/usr/bin/env python3
"""Make the built site viewable over file:// on the Mac.

Two problems this solves:

  1. `dist/` is gitignored and does NOT sync to the Mac, so there's nothing to open.
  2. Every asset reference is site-absolute (`/_astro/…`, `/fonts/…`, `/work/aping/`).
     Under file:// those resolve against the filesystem root, so the page loads with
     no CSS, no fonts, and dead links.

So: copy dist into the Unison-synced scratch tree and rewrite the absolute refs to
relative ones, appending `index.html` to directory links (file:// serves no index).

    python3 scripts/mac-preview.py        # after `npm run build`

Then open on the Mac:

    file:///Volumes/workplace/work/understand/andrewshiau-preview/index.html

This is a throwaway VIEWING copy — never deploy it (the droplet needs the absolute
paths). It exists because we can't run a dev server on the Amazon devbox.
"""
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DIST = REPO / 'dist'
OUT = Path.home() / 'workplace/work/understand/andrewshiau-preview'

# href="/x" / src="/x" / poster="/x"  → relative. Skips "//host" protocol-relative.
ATTR = re.compile(r'\b(href|src|poster)="/(?!/)([^"]*)"')
# url(/x) and url("/x") inside a <style> block or a .css file
URL = re.compile(r'url\((["\']?)/(?!/)([^)"\']*)\1\)')


def relativize(text: str, prefix: str) -> str:
    def attr(m):
        name, path = m.group(1), m.group(2)
        # a directory link ("/", "/work/aping/") needs an explicit index.html
        if path == '' or path.endswith('/'):
            path += 'index.html'
        return f'{name}="{prefix}{path}"'

    def url(m):
        quote, path = m.group(1), m.group(2)
        return f'url({quote}{prefix}{path}{quote})'

    return URL.sub(url, ATTR.sub(attr, text))


def main() -> int:
    if not DIST.is_dir():
        print('no dist/ — run `npm run build` first', file=sys.stderr)
        return 1

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(DIST, OUT)

    rewritten = 0
    for f in OUT.rglob('*'):
        if f.suffix not in ('.html', '.css') or not f.is_file():
            continue
        # depth of the file's directory below the site root → how far to climb
        depth = len(f.relative_to(OUT).parts) - 1
        prefix = '../' * depth
        src = f.read_text()
        out = relativize(src, prefix)
        if out != src:
            f.write_text(out)
            rewritten += 1

    print(f'{rewritten} files relativized → {OUT}')
    mac = str(OUT).replace(str(Path.home() / 'workplace'), '/Volumes/workplace')
    print(f'open on the Mac: file://{mac}/index.html')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
