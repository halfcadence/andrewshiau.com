#!/bin/bash
# Symlink the method pointer into the Claude Code global rules dir.
# Only POINTER.md is linked; method.md / designer.md / builder.md are read on demand,
# so editing content needs no reinstall. See INSTALL.md.
#
# Safe to re-run: an already-correct link reports ok, a foreign file is never clobbered.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
rules_dir="$HOME/.claude/rules"

if [ ! -d "$rules_dir" ]; then
  echo "skip: $rules_dir not present (is Claude Code installed for this user?)"
  exit 0
fi

target="$rules_dir/method.md"
src="$HERE/POINTER.md"

# A dangling link from an earlier location (the method used to live in the private work
# repo) would leave an agent loading a pointer to a path that moved. Clear it.
if [ -L "$target" ] && [ ! -e "$target" ]; then
  rm -f "$target"
  echo "removed $target (dangling)"
fi

if [ -L "$target" ] && [ "$(readlink -f "$target")" = "$src" ]; then
  echo "ok     $target (already linked)"
elif [ -e "$target" ] || [ -L "$target" ]; then
  current=$(readlink -f "$target" 2>/dev/null || echo "a real file")
  echo "REPLACING $target"
  echo "  was: $current"
  echo "  now: $src"
  ln -sfn "$src" "$target"
else
  ln -sfn "$src" "$target"
  echo "linked $target -> $src"
fi

readlink -f "$target"
