# method/

How I work, stated so an agent can run it. Not a model and not a biography — judgment as
procedures.

This sits in the site repo on purpose: the site's thesis and this spec are the same claim,
so they get edited together. If one changes, check the other.

| file | what it is |
|---|---|
| `method.md` | The root, always applies. *Both sides chase the same thing: the simplest thing that works. Taste finds the simplest form; engineering proves the simplest solution.* Names which side to load next. |
| `designer.md` | The eye as instrument — render every option in the real system, option 1 is what's live, taste as constraints. |
| `builder.md` | Measurement as instrument — prove it on the real deployment, pair every change with a control, name the mechanism, report the boundary of what was tested. |
| `messaging.md` | The reader's attention as instrument — name the ask and cut the rest, the artifact carries the detail, keep the judgments and cut the explanations, blamelessness is mechanical. Applies whenever work leaves your hands. |
| `POINTER.md` | The thin pointer — the only file linked into `~/.claude/rules/`; the rest are read on demand. |
| `INSTALL.md` | Install, the off-machine raw-URL option, and why a local path beats a URL here. |
| `install.sh` | `./method/install.sh` → links the pointer. Safe to re-run. |

The site's index carries the second sentence of `method.md` verbatim as its thesis. Those
two strings must match.

## Install

```bash
./method/install.sh
readlink -f ~/.claude/rules/method.md    # → <repo>/method/POINTER.md
```

Off this machine, point at the raw URL instead:
`raw.githubusercontent.com/halfcadence/andrewshiau.com/main/method/method.md`.
Details and the editing rules: [`INSTALL.md`](INSTALL.md).

**This repo is public.** No employer-internal systems, tickets, hosts, or personal detail
in these files — describe a pattern, never the system it came from.
