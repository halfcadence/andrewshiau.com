#!/bin/bash
# Run the practice-room e2e suite to a file, so a run outlives the shell that started it.
# The suite takes ~3.5 minutes (workers:1 — the audio clock is timing-sensitive), which is
# longer than an agent tool call's ceiling, and a redirect from a killed shell loses the log.
#
# Usage:  bash tools/run-e2e.sh [extra playwright args...]
#   E2E_PORT   preview port (default 4399, so two sessions don't share one server)
#   OUT        output file (default /tmp/e2e-out.txt)
cd "$(dirname "$0")/.." || exit 1
OUT="${OUT:-/tmp/e2e-out.txt}"
export E2E_PORT="${E2E_PORT:-4399}"
: > "$OUT"
npx playwright test --reporter=list "$@" >> "$OUT" 2>&1
echo "EXIT:$?" >> "$OUT"
