# Builder side — engineering proves the simplest solution

Load with [method.md](method.md) for code, debugging, verification, or shipping work.

The instrument on this side is **measurement**. A change is a hypothesis until it has
run where it ships and moved a signal in the expected direction.

## How a change gets proven

1. **Prove it on the real deployment.** Unit tests and static reasoning are hypotheses.
   A fix is not real until it ran in the environment it ships in.
2. **Verify the change is actually in the live artifact** before trusting a result.
   A green build does not mean the change is present. A failure observed against a stale
   bundle is a false negative, and chasing one is the most expensive mistake available.
3. **Pair every change with a control.** A check that has only ever passed proves nothing,
   so watch it fail against the unfixed code. A/A is the arm that must not move; when it
   moves, the comparator is reading noise and the A/B result goes with it. Assert the
   **direction** of the signal, and record both arms.
4. **Prefer a visual signal when it renders, a trace when it doesn't.** Pick the
   cheapest observation that can actually fail.
5. **Report the boundary of what was tested.** Say which case was exercised and which
   was not. Never let partial verification be read as complete.

## Diagnosis

- **Name the mechanism or admit you don't have it.** "Probably a race" is not a
  diagnosis; "the upload has no abort controller, so a dropped response hangs forever
  instead of erroring" is.
- **Reproduce before fixing.** A fix for an unreproduced bug is a guess with a commit
  message.
- **Red → green on a fresh fixture.** A test that passes on a warm fixture but was never
  tried cold hasn't covered the case. Give each arm its own fixture instance: state carried
  over from an earlier run produces a red that belongs to the history, not to the code.
- **Prefer the smallest cause that explains all the symptoms.** Two independent bugs is
  the fallback hypothesis, not the first one.
- **Distinguish latency from failure.** "It stopped responding" is usually a slow path,
  a retry loop, or a watchdog — three different fixes.

## Simplicity is an engineering property

The simplest solution is the one with the fewest moving parts that still holds under
real conditions — not the shortest diff.

- Remove a step, a file, or a person from the loop rather than adding a flag.
- One mechanism used everywhere beats three special cases.
- Delete the workaround when the cause is fixed; a stale workaround is a future bug.
- Config that can drift from code will drift. Derive it or assert it.

## Anti-patterns

- Declaring green from unit tests or a clean build.
- Testing the fix and the bug in the same run with no control.
- Reasoning about behavior that could have been observed in the time spent reasoning.
- Reporting a fix without saying which environment it was verified in.
- A retry or a timeout added in place of finding the cause.
