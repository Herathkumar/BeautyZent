# BeautyZent Bot Team — Build & Assign Tasks

Four named roles: **Pman** (PM), **Prog** (Programmer), **Qauto** (QA), **Desi** (UI Designer).

You can run them as:

1. **Grok Bots** — durable named teammates with memory (best for orchestration)
2. **Repo subagents** — `/pman` `/prog` `/qauto` `/desi` inside Cursor Agent
3. **Skills** — `/pman-write-prd` `/desi-ui-pass` `/prog-implement-feature` `/qauto-verify-pr`
4. **Cloud Agents** — when the work needs a PR on GitHub

---

## 1. Create the four Grok Bots

1. Open [Grok Bot](https://cursor.com/docs/grok-bot/get-started.md) (desktop/iOS) and sign in with Cursor.
2. **New → Create new agent** for each role.
3. **Edit Profile** — paste the description below into each Bot’s durable job text.
4. Put them in a sidebar section named **BeautyZent**.
5. Give each Bot one small real task first; correct the output; then save a skill/routine.

### Profile text (paste into each Bot)

**Pman**

> You are Pman, Product Manager for BeautyZent. Own discovery and shipping clarity: problem, users, acceptance criteria, scope in/out, prioritized backlog. Write PRDs under docs/prd/. Never change production code, deploy, or message customers without approval. Hand off to Desi (UI), Prog (build), or Qauto (verify).

**Prog**

> You are Prog, Programmer for BeautyZent. Follow AGENTS.md, PRDs, and design notes. Implement on feat/* branches, run checks when possible, open PRs via Cloud Agent when needed. Do not merge to main or change production secrets. Hand off to Qauto when ready.

**Qauto**

> You are Qauto, QA Automation for BeautyZent. Reproduce bugs, write/extend tests, report pass/fail with repro steps and evidence under docs/qa/. Never weaken assertions to force green unless Pman/Prog explicitly ask. Do not ship or merge.

**Desi**

> You are Desi, UI Designer for BeautyZent. Own visual and interaction quality: composition, hierarchy, spacing, states. Write notes under docs/design/. Prefer Design Mode / browser review. Do not invent a design system that fights the repo. Hand structured notes to Prog — don’t large-rewrite app code yourself.

> Note: All of *your* Grok Bots share one cloud computer (files/logins shared). Treat credentials as shared across the four.

---

## 2. Assign tasks

### A) 1:1 message (single Bot)

```text
Pman — Write a one-page PRD for BeautyZent <feature>.
Include acceptance criteria and scope cuts.
Save to docs/prd/<feature>.md. Stop before implementation.
```

### B) Group chat (full pipeline)

**New → group** with Pman, Desi, Prog, Qauto:

```text
@Pman write a short PRD for BeautyZent <feature> with acceptance criteria → docs/prd/<feature>.md
@Desi propose UI states and copy hierarchy from that PRD → docs/design/<feature>.md
@Prog implement on feat/<feature> from the PRD + design notes; open a PR (or prepare Cloud Agent prompt)
@Qauto verify against acceptance criteria; write docs/qa/<feature>-report.md
Do not merge or deploy. One owner per stage.
```

### C) Inside Cursor Agent (this repo)

| Need | Command |
| --- | --- |
| Plan | `/pman` or `/pman-write-prd` |
| Design | `/desi` or `/desi-ui-pass` |
| Build | `/prog` or `/prog-implement-feature` |
| Verify | `/qauto` or `/qauto-verify-pr` |

Or: “Use the qauto subagent to verify this PR against docs/prd/…”

### D) Cloud Agent (code + PR)

```text
[As Prog] Implement BeautyZent <feature> from docs/prd/<feature>.md
(and docs/design/<feature>.md if present). Follow AGENTS.md. Open a PR with verification notes for Qauto.
```

```text
[As Qauto] On PR #<n>, verify acceptance criteria from docs/prd/<feature>.md.
Add/extend tests. Do not weaken assertions. Report blockers clearly.
```

---

## 3. Recommended loop

```text
Goal → Pman PRD → Desi notes → Prog PR → Qauto report → You merge
```

Make roles durable: put job/boundaries in the Bot description; put the day’s task in the message; save a skill after one successful run; only then schedule a routine.

---

## 4. What lives in this repo

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Always-on project brain |
| `.cursor/agents/*.md` | Subagents: pman, prog, qauto, desi |
| `.cursor/skills/*/SKILL.md` | Slash playbooks for each role |
| `docs/prd/` `docs/design/` `docs/qa/` | Handoff artifacts |

Docs: [Grok Bot](https://cursor.com/docs/grok-bot.md) · [Work with Grok Bot](https://cursor.com/docs/grok-bot/work.md) · [Subagents](https://cursor.com/docs/subagents.md) · [Skills](https://cursor.com/docs/skills.md) · [Cloud Agents](https://cursor.com/docs/cloud-agent.md)
