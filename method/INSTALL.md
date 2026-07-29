# Installing the method

The method lives in this repo, beside the site whose thesis it states. Loading it is a
**filesystem read**, not a network fetch.

## Install (Claude Code, this machine)

`./method/install.sh` symlinks the pointer into the rules directory Claude Code loads
globally:

```
~/.claude/rules/method.md -> <repo>/method/POINTER.md
```

Only `POINTER.md` is linked — a short file naming the path and the two sides. The content
is read on demand, which keeps the always-loaded footprint small and means editing
`method.md` needs no reinstall.

Verify:

```bash
readlink -f ~/.claude/rules/method.md    # → <repo>/method/POINTER.md
```

## Why a path and not a URL

This repo is public, so a raw-GitHub pointer would work. A local path is still better:

- No network, no auth, no cache, no rate limit — nothing to fail silently.
- The files you edit are the files the agent reads. A URL adds a push-then-propagate step
  between "I changed it" and "the agent sees it," and a stale read is invisible.
- An agent working on this repo already has the files checked out.

A raw URL is the right choice for a machine that can't clone this repo — see the next
section.

## Install (other surfaces)

- **Anything off this machine** (Claude.ai projects, other agents, a phone) — either
  point at the raw URL:

  ```
  https://raw.githubusercontent.com/halfcadence/andrewshiau.com/main/method/method.md
  ```

  …or paste the **contents** of `method.md` plus the relevant side into the standing
  instructions. Pasting is a snapshot and will drift; the URL won't.
- **Kiro** — no rules directory equivalent. Paste `POINTER.md`'s contents into the
  agent's standing instructions.

## Editing

- **Content edit** (`method.md`, `designer.md`, `builder.md`, `messaging.md`) → edit,
  commit, push.
  Nothing to reinstall; the pointer is unchanged.
- **Mechanism edit** (`POINTER.md`, the path) → re-run `./method/install.sh` and
  re-verify the symlink.

The site's index carries `method.md`'s second sentence verbatim. Change one, change both —
that co-location is why this lives here rather than in a separate repo.

## This repo is public

Keep it that way in what you write here. No employer-internal systems, tickets, hosts,
credentials, or personal/financial detail. Describe a pattern, never the system it came
from. The private `work` repo holds a `scrub-check.sh` gate for anything uncertain (the
gate stays private — its marker list is itself a roster of internal names).

## Naming

This was called a "digital twin" for about a day, after the pattern it borrows from. The
name was wrong twice: it reads as a stand-in for a person, which this isn't, and it named
the mechanism instead of the content. It encodes a method — how decisions get made.
