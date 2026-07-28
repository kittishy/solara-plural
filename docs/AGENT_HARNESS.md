# AGENT_HARNESS.md - Solara Plural Agent Engineering Harness

> **ALWAYS read this before any task.** Shared operating brain for Claude Code, OpenCode, Codex,
> and model-variant agents. Every agent, every task, every edit — read this once per session and
> apply its gates, model routing, idea-fit rubric, and validation matrix to every change.
> It complements `AGENTS.md`; it does not replace product docs.

---

## 1. Purpose

Solara Plural uses many agent runtimes and model families. The harness keeps them aligned so
fast or experimental models can help without drifting away from the project.

The harness exists to:

- preserve the project intent: warm, private, safe software for plural systems;
- keep production changes conservative and verifiable;
- let open-source/free models contribute as explorers, planners, reviewers, and QA sidecars;
- force every implementation through the same context, quality, and product-fit checks;
- keep good ideas flowing while filtering out ideas that do not fit Solara right now.

If a model is uncertain, it must say what is missing. It must not invent APIs, schema state,
migration status, production state, user data, or external provider behavior.

---

## 2. Source-Of-Truth Stack

Agents must treat these as ordered truth layers:

1. `AGENTS.md` - mandatory entry point and skill routing.
2. `docs/MASTER_CONTEXT.md` - product vision, current MVP, critical rules.
3. `docs/PROJECT_STYLE_GUIDE.md` - UI/design source of truth.
4. `docs/ARCHITECTURE.md` - runtime boundaries and production architecture.
5. `docs/DATA_MODEL.md` - schema and data relationships.
6. `docs/DECISIONS.md` - durable decisions; append significant decisions here.
7. `docs/VERCEL_DEPLOYMENT.md` - deploy, env, migration, and verification rules.
8. `docs/ROADMAP.md` - what is done, next, and future.
9. `docs/SOUL.md` - agent personality, tone, voice, and values (see section 12).
10. `docs/KNOWN_ISSUES.md` - current blockers, risk notes, and workarounds.
11. This file - agent harness, gates, model routing, idea fit, and self-improvement.

Task-specific local skills in `.skills/` override generic instincts. For code quality,
always enforce `.skills/software-engineering-standards/SKILL.md`.

Never use `.env*`, raw secrets, database dumps, private member data, `.git`, `node_modules`,
`.next`, build artifacts, or unrelated projects as context for general agent work.

---

## 3. Runtime Boundaries

### Primary path: Android APK

The **Android APK** is the primary build target. Everything is designed for Android
first — the website and PWA exist as secondary platforms, sharing the same backend
and data model but built around the Android experience:

- Android app (Kotlin/Compose or framework chosen for the mobile path)
- Consumes backend through `mobile-app/src/services` API contracts
- Touch-first, native-feeling UI
- Offline-capable where the data model allows

### Secondary paths: Website + PWA

The **website** (Next.js 14 App Router, Vercel) and **PWA** are secondary platforms.
They share the same backend but are not the primary design target:

- Next.js 14 App Router
- Auth.js / NextAuth v5
- Drizzle ORM
- Turso/libSQL history plus current Supabase-related operational notes where documented
- Vercel deployment

Features must work on Android first. Website/PWA get the same features but may have
different UI optimized for desktop browser or PWA install.

### Experimental Ruby path

`experiments/ruby-api/` is additive and experimental. It must not be treated as the active
production backend unless the user explicitly asks for Ruby experiment work or the docs have a
new decision changing production ownership.

---

## 4. Agent Team Contract

Use existing durable agents only:

- `orchestrator` - route complex work and keep the project coherent.
- `architect` / `arch` - architecture, data model, integration, auth, migration risk.
- `designer` / `ui` - UI, UX, visual system, copy, responsive behavior.
- `builder` / `b` - scoped implementation.
- `reviewer` / `rev` - bugs, regressions, type safety, security, architecture drift.
- `qa` - validation, test strategy, browser/responsiveness checks, failure triage.
- `deployer` / `dep` - Vercel, env vars, migrations, release readiness.

Do not invent temporary role names. If a new specialist is truly needed, create a durable agent
file and record why in `docs/DECISIONS.md`.

For complex work, default sequence:

1. `orchestrator` reads context and splits work.
2. `architect` plans high-risk backend/auth/data/integration work.
3. `designer` plans UI/product-flow work.
4. `builder` implements once the scope is clear.
5. `reviewer` checks meaningful changes.
6. `qa` validates the smallest behavior set that proves the work.
7. `deployer` checks production readiness only for release/deploy/config work.

Skip swarm overhead for small, obvious, single-file edits.

---

## 5. Model Routing

Use model variation deliberately. A model can be fast and creative while still being boxed into
the right job.

### Good use of free/open-source models

- repo mapping and search;
- first-pass architecture options;
- first-pass code review;
- QA checklist generation;
- alternative ideas and tradeoff discovery;
- summarizing docs into bounded context packs.

### Risky use of free/open-source models

Do not let weaker or untrusted models be the final authority for:

- auth/session changes;
- database migrations or production schema state;
- secrets, token encryption, integration credentials;
- external provider write behavior;
- destructive scripts or cleanup `--apply` paths;
- deploy steps or env var changes;
- private user/member data handling.

These can still be explored by sidecar models, but final decisions need the active senior agent
plus `reviewer`, `qa`, or `deployer` as appropriate.

### OpenCode model policy

OpenCode can use free remote models for bounded sidecar work. Current known free-model family
examples in this repo include:

- `opencode/nemotron-3-super-free`
- `openrouter/nvidia/nemotron-3-super-120b-a12b:free`
- `openrouter/deepseek/deepseek-chat-v3.2:free`
- `openrouter/qwen/qwen3-235b-a22b:free`
- `openrouter/moonshotai/kimi-k2:free`

Do not switch to local/Ollama/LM Studio/paid providers for project work unless the user explicitly
requests that runtime or approves the change.

### Output contract for model-variant agents

Every model-variant agent must return:

- files/docs inspected;
- assumptions;
- confidence level;
- risks and unknowns;
- exact commands suggested or run;
- whether it edited files;
- next gate required before merge/deploy.

If the model cannot cite repo evidence, it must label the result as a hypothesis.

---

## 6. Quality Gates

### Universal preflight

- Confirm repository root with `git rev-parse --show-toplevel` when context may be ambiguous.
- Check `git status --short` before edits.
- Read `AGENTS.md`, task-relevant docs, and relevant skills.
- Use the token-economy context builder only when it saves more context than it costs.
- Avoid unrelated refactors.

### Backend/API gate

- Parse request JSON as `unknown`/record first; never introduce casual `any`.
- Derive `systemId` from the authenticated session, never request body.
- Preserve `{ success, data/error }` response family unless changing an established contract.
- Validate ownership before reading/writing member, note, front, social, notification, or integration data.
- Keep provider tokens and push subscriptions encrypted or request-only; never export plaintext secrets.

### Database/migration gate

- Before schema work, read `docs/DATA_MODEL.md`, `drizzle/`, and `docs/KNOWN_ISSUES.md`.
- Do not run `db:generate` while migration snapshots/journal are known inconsistent unless the task is the repair itself.
- Every schema-touching production merge needs a migration application plan before deploy.
- Prefer forward-only repair. Do not delete/quarantine migrations without evidence.

### Integration gate

- Treat provider docs and observed responses as contract evidence.
- Use preview/dry-run before apply when user data can change.
- Surface rate limits and partial success diagnostics; do not hide provider failures.
- Do not log tokens, raw request bodies, notes, member details, or private front data.

### UI/product gate

- For UI, read `.craft/anti-ai-slop.md`, `.skills/design-md/SKILL.md`, and `docs/PROJECT_STYLE_GUIDE.md`.
- Preserve the warm, human, private tone.
- **Android APK is the primary design target.** Features work on Android first; website and PWA are secondary. Touch behavior matters everywhere.
- Do not make clinical, productivity-dashboard, or generic SaaS UI.
- Use existing tokens and patterns before adding new design language.

### Deploy gate

- Read `docs/VERCEL_DEPLOYMENT.md`.
- Confirm required env vars are documented, not printed.
- Run or plan `npm run build` for deploy-impacting changes.
- Schema changes must be applied to the intended production database before code that depends on them is live.
- Actual production mutation needs explicit user instruction.

---

## 7. Idea-Fit Rubric

Before implementing a new idea, score it 0-2 in each category:

| Category | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Solara purpose | Generic or off-mission | Adjacent | Directly helps plural safety, privacy, organization, or trust |
| Current roadmap | Not tracked and distracting | Future/backlog fit | Fits active roadmap or known issue |
| Privacy/safety | Adds unclear exposure | Manageable with guardrails | Improves consent, privacy, or reversibility |
| Architecture fit | Fights current stack | Requires careful bridge | Reuses existing patterns cleanly |
| Maintenance cost | High unclear cost | Moderate | Small, durable, easy to test |
| Reversibility | Hard to undo | Partially reversible | Additive or easy to roll back |

Recommended action:

- 10-12: implement after normal planning.
- 7-9: write a short plan or add to `docs/IDEAS.md` before building.
- 4-6: backlog only unless the user explicitly prioritizes it.
- 0-3: reject or reshape; explain the mismatch.

Good agents should suggest ideas, but only after applying this rubric.

---

## 8. Validation Matrix

Use the smallest command set that proves the change.

| Change type | Minimum validation | Stronger validation |
| --- | --- | --- |
| Docs/agent config only | JSON parse for configs, file references exist, `git diff --check` | reviewer + qa pass |
| TypeScript pure logic | focused test or `npm test` | `npx tsc --noEmit`, `npm run lint` |
| API/auth/data | focused tests plus `npx tsc --noEmit` | `npm run build`, route smoke test |
| UI | lint/type/build based on scope | browser desktop + mobile check |
| DB migration | inspect migration + apply to disposable DB | production migration checklist |
| Deploy/config | `npm run build`, Vercel checklist | deployer review |

Do not claim production safety from docs alone when runtime behavior changed.

---

## 9. Memory Architecture (4-Layer Model)

Inspired by Hermes Agent (Nous Research), the harness follows a layered memory model.
Each layer has a different retention, capacity, and access pattern. Treat them as a stack:
lower layers are fast and bounded; upper layers are richer but slower.

### Layer 1: Working Context

The current conversation or task window. Not persisted between sessions.
- Task prompt, relevant docs loaded for this task, current `git diff`, terminal output.
- Discarded when the session ends.

### Layer 2: Persistent Declarative Memory

Two bounded files curated by the agent across sessions:

| File | Purpose | Target size |
| --- | --- | --- |
| `~/.solara-memory/MEMORY.md` | Agent's notes — project facts, conventions, environment, things learned | ~800 tokens |
| `~/.solara-memory/USER.md` | User profile — preferences, workflow style, communication expectations | ~500 tokens |

Both are injected at session start. The agent manages them via the `memory` tool:
add facts, consolidate when full, remove stale entries. If a write would exceed the
limit, free space first by consolidating or deleting low-value entries.

**Do not** put secrets, credentials, tokens, or private member data here.

### Layer 3: Project Artifacts

Durable project documentation, managed by convention:

- `docs/DECISIONS.md` — significant architecture and process decisions.
- `docs/CHANGELOG.md` — user-visible changes.
- `docs/KNOWN_ISSUES.md` — current bugs, blockers, operational limits.
- `docs/IDEAS.md` — product ideas that passed the fit rubric but are not built.
- `docs/VERCEL_DEPLOYMENT.md` — deploy, migration, and env lessons.
- `docs/SOUL.md` — agent personality and voice (see section 12).

Search these with `grep` or `rg` when context is stale or the task references
past decisions. Append new entries at the top of the relevant file.

### Layer 4: Procedural Memory (Skills)

Reusable task knowledge stored as skills:

- Built-in skills in `.skills/` — read the relevant `SKILL.md` before each task.
- Auto-created skills in `~/.solara-memory/skills/` — when you solve a novel
  problem, write a reusable `SKILL.md` so the pattern is available next time.
- Community skills from `agentskills.io` — install with `/skill-install <name>`.

The agent should auto-create a skill whenever it spends more than 15 minutes on
a problem that is likely to repeat. The skill must be a standalone `SKILL.md` in
a category subdirectory, with a clear trigger condition and step-by-step instructions.

### Cross-Session Continuity

When previous agent work exists, resume from the real branch and current state
instead of restarting the feature. Preserve reviewed SHAs, skipped candidates,
blockers, and validation evidence when they matter for later runs.

To recall a past session, search previous conversations with `rg` over notes or
use the memory files. Do not assume all context from a past session is still
valid — verify the current state of the relevant files.

---

## 10. Behavior Summary (Everything Is Automatic)

No commands needed. Every harness behavior is embedded in the agent system prompt:

| Behavior | When it runs automatically |
|----------|---------------------------|
| **SOUL.md personality** | Loaded at every session start |
| **Source-of-truth stack** | Read ordered docs before any task |
| **Quality gates** | Applied to every edit — backend, DB, UI, deploy, integration |
| **Idea-fit rubric** | Self-scored before every suggestion or feature idea |
| **Model routing** | Orchestrator assigns work based on risk level |
| **Validation matrix** | Agent selects and runs the minimum validation set for the change |
| **Reflection loop** | Written after every non-trivial task completion |
| **Memory curation** | MEMORY.md / USER.md updated as context accumulates |
| **Agent delegation** | Orchestrator routes to architect → designer → builder → reviewer → QA → deployer |
| **Subagent isolation** | Parallel work gets bounded context automatically |

**Optional explicit invocation** — skill files in `.claude/skills/` and command files
in `.opencode/commands/` exist as shortcuts for edge cases, but you never need them
in normal flow.

---

## 11. Self-Improvement & Reflection Loop

Inspired by Hermes Agent's GEPA (Genetic-Pareto Prompt Evolution, ICLR 2026 Oral),
the harness includes a lightweight reflection protocol. It does not evolve prompts
automatically — instead, every agent writes a structured trace after non-trivial work
so that patterns, failures, and optimizations compound over time.

### Automatic reflection trigger

The agent writes a reflection **automatically** — no command needed — after any task
that meets at least one of:

- edited 3+ files;
- touched auth, data, migration, integration, or deploy logic;
- ran a non-trivial investigation or debug session;
- tried an approach that failed before finding the right path;
- involved a model or workflow the agent has not used before.

### Automatic reflection format

The agent writes into `~/.solara-memory/reflections/<date>-<task-slug>.md` immediately
after completing the task, before reporting done:

```markdown
# Reflection: <task description>
Date: <date>
Agent: <agent-role> (<model-name>)
Duration: <estimated minutes>

## What worked
- <approach or tool that was effective>
- <context or doc that helped>

## What didn't work
- <approach or assumption that wasted time>
- <failure or blocker>

## What to do differently next time
- <concrete change to process, context, or tooling>

## Reusable pattern?
- [ ] Yes — skill created at `skills/<category>/<name>/SKILL.md`
- [ ] No
```

Keep reflections under 500 tokens. The goal is signal, not completeness.

### How reflections compound

1. Before a new task, `rg "What to do differently" ~/.solara-memory/reflections/`
   to check if past failures or optimizations apply.
2. If 3+ reflections identify the same pattern, escalate it to a quality gate in
   this file or a new entry in `docs/DECISIONS.md`.
3. If a reflection identifies a reusable solution pattern, create a skill in
   `~/.solara-memory/skills/` so the next agent can use `/learn <name>`.

### GEPA-inspired principle

The agent should treat its own process as optimizable. If a prompt, tool choice,
or context strategy consistently produces poor results, reflect on it, mutate the
approach, and evaluate the new result. Do not repeat the same failing pattern
without attempting a fix.

---

## 12. Agent Personality & Voice — SOUL.md

Inspired by Hermes Agent's SOUL.md system, `docs/SOUL.md` defines the personality,
tone, and identity of every agent working on Solara Plural. It is loaded at session
start and injected into the system prompt.

### What SOUL.md contains

- **Identity** — who the agent is in the context of Solara Plural.
- **Tone** — the voice and register for communication.
- **Values** — what the agent prioritizes and protects.
- **Boundaries** — what the agent does not do.
- **Relationship** — how the agent relates to the user and the project.

### Automatic loading

SOUL.md is **always in context** — no command needed:

1. **Claude Code** — `CLAUDE.md` mandates `docs/SOUL.md` as a required read at session start.
2. **OpenCode** — `opencode.json` instructions include `docs/SOUL.md`.
3. **All agents** — `docs/SOUL.md` is loaded at every session start, before any task,
   as part of the automatic startup sequence.

The SOUL.md is project-wide and applies to every agent role. Role-specific tone
variations (e.g., reviewer is more direct, designer is more exploratory) are
documented within the SOUL.md itself.

### Updating SOUL.md

The SOUL.md evolves with the project. When the user gives feedback about tone,
communication style, or priorities, record the change in `docs/DECISIONS.md` and
update `docs/SOUL.md` to reflect the new consensus. Do not change SOUL.md without
recording the decision.

---

## 13. Subagent & Parallel Work Patterns

Inspired by Hermes Agent's isolated subagent system for zero-context-cost pipelines,
the harness supports parallel agent coordination without context pollution.

### When to use subagents

- Independent files or modules can be edited in parallel by different agents.
- One task has a research track and an implementation track that do not overlap.
- A model-variant sidecar can explore alternatives while the main agent implements.

### Isolation rules

1. Each subagent gets its own bounded context — only the docs, skills, and files
   relevant to its slice.
2. Subagents do not share memory files or reflection stores concurrently.
3. The orchestrator merges results after each subagent reports done.
4. If two subagents would edit the same file, serialize them instead.

### Parallel coordination flow

```
orchestrator
  ├── architect + designer (parallel planning — architecture + UI)
  ├── builder-1 (implementation: backend)
  ├── builder-2 (implementation: frontend)
  │   └── reviewer (serial — reviews both after merge)
  └── qa (serial — validates the integrated result)
```

The orchestrator must read `docs/AGENT_HARNESS.md` and `docs/DECISIONS.md` before
splitting work, and ensure each subagent receives the subset of context it needs.

### Subagent output contract

Every subagent must return to the orchestrator:

- files inspected and files changed;
- any blockers, assumptions, or unresolved risks;
- whether its output needs review before merging;
- the next gate required (reviewer, qa, deployer).

The orchestrator compiles these into a single summary for the user.

---

## 14. Hermes Agent Runtime (Optional)

[Hermes Agent](https://hermes-agent.nousresearch.com) by Nous Research (MIT, 194K+
GitHub stars, v0.15+) is an open-source self-improving agent that can run alongside
this harness as an independent runtime.

### When to use Hermes Agent alongside this harness

- **Scheduled tasks** — Hermes has natural-language cron for recurring reports,
  backups, and monitoring.
- **Persistent background agent** — Hermes runs on a VPS and maintains its own
  memory, skills, and messaging gateway (Telegram, Discord, Slack).
- **Heavy parallel execution** — Hermes supports 6 terminal backends (local, Docker,
  SSH, Daytona, Singularity, Modal) for sandboxed multi-execution.
- **Skill ecosystem** — Hermes auto-creates skills from experience and can pull
  community skills from `agentskills.io`.

### Integration notes

- This harness (`docs/AGENT_HARNESS.md`) is compatible with Hermes's AGENTS.md
  context-file loading — Hermes reads `AGENTS.md` from the working directory
  at session start.
- The memory files (`MEMORY.md`, `USER.md`) follow the same format Hermes uses,
  so they can be shared between runtimes.
- The SOUL.md format is directly compatible with Hermes Agent's personality system.
- Hermes uses the same OpenRouter/OpenCode model ecosystem listed in section 5,
  plus its own Nous Portal provider.

Do not switch to Hermes Agent for standard implementation, review, or deploy work
unless the user explicitly requests it or the task specifically needs Hermes's
scheduling, messaging, or sandboxing capabilities. This harness is the default
operating brain; Hermes is an optional power tool.
