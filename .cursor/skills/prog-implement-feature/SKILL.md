---
name: prog-implement-feature
description: Implement a BeautyZent feature from PRD/design on a feature branch and prepare Qauto handoff. Use when coding from an approved spec.
disable-model-invocation: true
---

# Prog — Implement Feature

Act as **Prog**. Implement against the given PRD (and design notes if present).

## Steps

1. Read `AGENTS.md`, `docs/prd/<feature>.md`, and `docs/design/<feature>.md` if present.
2. Confirm acceptance criteria; ask only if blocked.
3. Work on `feat/<feature-slug>` (create if needed).
4. Implement the smallest change that meets criteria.
5. Run available checks; note anything you could not run.
6. Summarize verification steps for **Qauto**.

## Done when

- Criteria addressed or explicitly deferred with Pman approval
- Diff is reviewable
- Handoff notes include how to verify
