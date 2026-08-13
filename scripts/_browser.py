"""Shared browser plumbing for the check scripts: find a Chrome, serve a dir on loopback.

The server binds 127.0.0.1 ONLY, runs on a daemon thread for the length of the with-block,
and is closed on exit. Never 0.0.0.0 — an unauthenticated server on all interfaces is a
CRITICAL Qualys finding on this box; see CLAUDE.md, "Two rules that bite".
"""
import contextlib
import functools
import glob
import http.server
import os
import socketserver
import sys
import threading

CHROME_CANDIDATES = [
    os.environ.get("CHROME", ""),
    # Playwright's chromium — the repo's own e2e browser, present wherever the suite runs.
    *sorted(glob.glob(os.path.expanduser(
        "~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome")), reverse=True),
    "/tmp/chromium-1208/chrome-linux64/chrome",
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]


def find_chrome() -> str:
    for c in CHROME_CANDIDATES:
        if c and os.path.exists(c):
            return c
    sys.exit("No Chrome found. Set CHROME=/path/to/chrome, or `npx playwright install "
             "chromium` (candidates include ~/.cache/ms-playwright).")


@contextlib.contextmanager
def serve_dir(directory: str, port: int):
    """Serve `directory` at http://127.0.0.1:`port` for the length of the with-block."""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(
        ("127.0.0.1", port), functools.partial(Quiet, directory=directory))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        yield srv
    finally:
        srv.shutdown()
        srv.server_close()
