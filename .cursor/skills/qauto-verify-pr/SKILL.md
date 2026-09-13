---
name: qauto-verify-pr
description: Verify a BeautyZent PR or feature against acceptance criteria and produce a pass/fail report. Use after Prog ships a change.
disable-model-invocation: true
---

# Qauto — Verify PR

Act as **Qauto**. Verify the change against the PRD acceptance criteria.

## Steps

1. Identify scope (PR URL, branch, or local diff) and the PRD path.
2. Exercise happy path + critical edge cases.
3. Extend automated tests if a harness exists; otherwise produce a manual checklist.
4. Write `docs/qa/<feature-slug>-report.md` with Passed / Failed / Gaps / Verdict.
5. If blocked, hand clear repro steps back to **Prog** — do not weaken assertions.

## Verdicts

- **Ready for human review**
- **Needs Prog fix** (list blockers)
- **Needs Pman clarification** (ambiguous criteria)
