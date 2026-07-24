// Dev-only annotation integration for andrewshiau.com.
//
// Lets you (on the Mac, `npm run dev`) drop pin-notes on the live page: press `a`
// to arm, click anything, type a note. Notes POST to a dev-only endpoint that
// appends them to `annotate/notes.ndjson` in the repo — which Unison syncs to the
// devbox so the agent can read + address them.
//
// It is wired ONLY in `astro dev` (via the `astro:server:setup` hook + a dev-only
// script injection). It emits NOTHING into `astro build`, so the production static
// site is completely untouched. No new npm deps.
import { appendFile, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const NOTES = join(HERE, 'notes.ndjson');

export default function annotate() {
  let isDev = false;
  return {
    name: 'andrewshiau-annotate',
    hooks: {
      // Only inject the client overlay when running the dev server.
      'astro:config:setup': ({ command, injectScript }) => {
        if (command !== 'dev') return;
        isDev = true;
        // Inject the overlay source directly (not via an import) so Vite doesn't need
        // to resolve a virtual id. `page` = browser-side, dev only here.
        injectScript('page', OVERLAY_JS);
      },

      // Register the dev middleware: accept POSTed notes.
      'astro:server:setup': ({ server }) => {
        // Note sink: POST {page, note, x, y, selector, label} → append to ndjson.
        server.middlewares.use('/__annotate', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (c) => (body += c));
            req.on('end', async () => {
              try {
                const rec = JSON.parse(body || '{}');
                rec.ts = new Date().toISOString();
                await mkdir(HERE, { recursive: true });
                await appendFile(NOTES, JSON.stringify(rec) + '\n', 'utf8');
                res.statusCode = 200;
                res.end('ok');
              } catch (e) {
                res.statusCode = 400;
                res.end('bad');
              }
            });
            return;
          }
          if (req.method === 'GET') {
            // Let the overlay reload existing pins for the current page.
            readFile(NOTES, 'utf8')
              .then((t) => { res.setHeader('Content-Type', 'application/x-ndjson'); res.end(t); })
              .catch(() => { res.end(''); });
            return;
          }
          if (req.method === 'DELETE') {
            // Clear all notes (the overlay's "clear" button).
            writeFile(NOTES, '', 'utf8').then(() => res.end('cleared')).catch(() => { res.statusCode = 500; res.end('err'); });
            return;
          }
          res.statusCode = 405;
          res.end();
        });
      },
    },
  };
}

// ── the client overlay, served as a module in dev only ──────────────────────────
const OVERLAY_JS = String.raw`
(() => {
  if (window.__annotateLoaded) return; window.__annotateLoaded = true;
  const PAGE = location.pathname;
  let armed = false;

  // a short, stable-ish CSS path for an element (for the agent to locate it)
  const sel = (el) => {
    if (!el || el === document.body) return 'body';
    const parts = [];
    let n = el, depth = 0;
    while (n && n.nodeType === 1 && n !== document.body && depth < 4) {
      let s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(s + '#' + n.id); break; }
      const cls = (n.className && typeof n.className === 'string') ? n.className.trim().split(/\s+/).slice(0,2).join('.') : '';
      if (cls) s += '.' + cls;
      const sibs = n.parentNode ? [...n.parentNode.children].filter(c => c.tagName === n.tagName) : [];
      if (sibs.length > 1) s += ':nth-of-type(' + (sibs.indexOf(n)+1) + ')';
      parts.unshift(s); n = n.parentNode; depth++;
    }
    return parts.join(' > ');
  };

  // ── UI: a small toolbar + toast ──
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;z-index:2147483647;bottom:14px;right:14px;font:600 12px/1.3 -apple-system,system-ui,sans-serif;background:#141412;color:#f4f3ef;border:1px solid #ff4d3f;border-radius:2px;padding:8px 10px;display:flex;gap:10px;align-items:center;box-shadow:0 2px 12px rgba(0,0,0,.4);cursor:default';
  bar.innerHTML = '<span id="__an_state" style="color:#ff4d3f">● annotate: off</span><span style="opacity:.55">press <b>a</b> to arm · <b>Esc</b> off</span><button id="__an_list" style="all:unset;cursor:pointer;color:#f4f3ef;text-decoration:underline">notes</button><button id="__an_clear" style="all:unset;cursor:pointer;color:#f4f3ef;text-decoration:underline">clear</button>';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(bar));
  if (document.body) document.body.appendChild(bar);

  const stateEl = () => document.getElementById('__an_state');
  const setArmed = (v) => { armed = v; const s = stateEl(); if (s) s.textContent = '● annotate: ' + (v ? 'ON — click a spot' : 'off'); document.body.style.cursor = v ? 'crosshair' : ''; };

  const toast = (msg) => {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;z-index:2147483647;bottom:60px;right:14px;background:#ff4d3f;color:#fff;font:600 12px/1.3 system-ui;padding:7px 10px;border-radius:2px';
    document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
  };

  const pin = (x, y, note) => {
    const p = document.createElement('div');
    p.title = note;
    p.style.cssText = 'position:absolute;z-index:2147483646;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#ff4d3f;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);left:' + x + 'px;top:' + y + 'px';
    document.body.appendChild(p);
  };

  document.addEventListener('keydown', (e) => {
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) setArmed(!armed);
    if (e.key === 'Escape') setArmed(false);
  });

  document.addEventListener('click', (e) => {
    if (!armed) return;
    if (bar.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    const target = e.target;
    const label = (target.textContent || '').trim().slice(0, 50);
    const note = window.prompt('Note for this spot (' + (target.tagName.toLowerCase()) + '):');
    if (!note) return;
    const x = e.pageX, y = e.pageY;
    pin(x, y, note);
    fetch('/__annotate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: PAGE, note, selector: sel(target), label, x: Math.round(x), y: Math.round(y), vw: innerWidth }) })
      .then(() => toast('saved ✓')).catch(() => toast('save failed'));
  }, true);

  // reload existing pins for this page
  fetch('/__annotate').then(r => r.text()).then(t => {
    t.split('\n').filter(Boolean).forEach(line => {
      try { const r = JSON.parse(line); if (r.page === PAGE && r.x != null) pin(r.x, r.y, r.note); } catch {}
    });
  }).catch(() => {});

  document.getElementById && setTimeout(() => {
    const list = document.getElementById('__an_list'), clr = document.getElementById('__an_clear');
    if (list) list.onclick = () => fetch('/__annotate').then(r=>r.text()).then(t=>{
      const mine = t.split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(r=>r&&r.page===PAGE);
      alert(mine.length ? mine.map((r,i)=>(i+1)+'. '+r.note+'  ['+r.selector+']').join('\n') : 'No notes on this page yet.');
    });
    if (clr) clr.onclick = () => { if (confirm('Clear ALL annotation notes?')) fetch('/__annotate',{method:'DELETE'}).then(()=>{toast('cleared'); [...document.querySelectorAll('div[title]')].forEach(d=>{ if(d.style.background==='rgb(255, 77, 63)'&&d.style.borderRadius==='50%')d.remove(); });}); };
  }, 300);
})();
`;
