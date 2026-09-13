# BeautyZent — Agent Guide

BeautyZent is a beauty/wellness product project. All coding agents (local, Cloud, Grok-delegated) follow this file.

## Team roles

| Role | Name | Owns | Does not |
| --- | --- | --- | --- |
| Product Manager | **Pman** | Specs, acceptance criteria, prioritization | Production code, deploys |
| Programmer | **Prog** | Implementation, PRs, local verification | Merging to main without review |
| QA Automation | **Qauto** | Tests, repro packs, quality gates | Weakening assertions to “pass” |
| UI Designer | **Desi** | Layout, visual hierarchy, interaction states | Inventing a conflicting design system |

Invoke project subagents with `/pman`, `/prog`, `/qauto`, `/desi`, or ask Agent to delegate.

## Default feature pipeline

1. **Pman** → one-page PRD + acceptance criteria → `docs/prd/<feature>.md`
2. **Desi** → UI notes / states → `docs/design/<feature>.md` (or annotated screenshots)
3. **Prog** → implement on `feat/<feature>` → open PR
4. **Qauto** → verify PR → report pass/fail + gaps
5. **Human** → review & merge

## Working rules

- One owner per stage; hand off with a clear artifact path.
- Prefer small PRs with a clear finish line.
- Do not merge, deploy, or change production secrets without explicit approval.
- Prefer real product/place imagery and established UI patterns once the design system exists.
- When stack/commands are unknown, invent nothing: propose a minimal stack and ask before committing to it.

## Artifacts

| Artifact | Path |
| --- | --- |
| PRDs | `docs/prd/` |
| Design notes | `docs/design/` |
| QA reports | `docs/qa/` |
| Role playbooks | `.cursor/skills/` |
| Role subagents | `.cursor/agents/` |

## Task assignment templates

See `docs/bot-team.md` for Grok Bot profiles, group-chat kickoffs, and Cloud Agent prompts.
