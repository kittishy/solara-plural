# Solara Plural — Claude/OpenCode Instructions

> **READ THIS BEFORE ANY ACTION.** This file applies to Claude Code, OpenCode, and any Anthropic-based agent.

---

## Mandatory: Use Local Skills

This repository has a **complete copy of all skills** in the `.skills/` directory.

**BEFORE starting any task:**
1. Check `.skills/` for relevant skills
2. Read the `SKILL.md` file of each relevant skill
3. Follow the skill instructions

**For UI tasks**, always read:
- `.skills/design-md/SKILL.md` — then `docs/PROJECT_STYLE_GUIDE.md`
- `.skills/frontend-design/SKILL.md` or `.skills/frontend-skill/SKILL.md`

**For deployment**, always read:
- `.skills/vercel-deploy/SKILL.md` — then `docs/VERCEL_DEPLOYMENT.md`

**For architecture**, always read:
- `.skills/typed-service-contracts/SKILL.md`
- `docs/ARCHITECTURE.md`

---

## Project Context

Read `AGENTS.md` for the full skills catalog and workflows.
Read `docs/MASTER_CONTEXT.md` for project vision and rules.
Read `docs/PROJECT_STYLE_GUIDE.md` for design tokens (NEVER overwrite this file).

---

## Rules

1. Always use skills from `.skills/` — they exist locally, no need to access global paths
2. Never overwrite `docs/PROJECT_STYLE_GUIDE.md`
3. Document decisions in `docs/DECISIONS.md`
4. Keep UI warm, human, accessible
5. Use TypeScript strict typing
6. Test before declaring done

---

## OpenCode Agent Workflows

To assist the OpenCode AI in suggesting the correct agent via CLI Tab autocomplete, follow these workflow routing rules:

- **Build/Develop Tasks:** Route to the `builder` agent (alias: `b`).
- **Code Review Tasks:** Route to the `reviewer` agent (alias: `rev`).
- **Testing/QA Tasks:** Route to the `qa` agent (alias: `qa`).
- **UI/UX Design Tasks:** Route to the `designer` agent (alias: `ui`).
- **Deployment Tasks:** Route to the `deployer` agent (alias: `dep`).

---

## ⚠️ STRICT AGENT DELEGATION POLICY ⚠️

To emulate Codex's correct behavior and prevent the AI from trying to do everything itself or hallucinating new agents:
1. **DO NOT create, hallucinate, or simulate new agents on the fly.**
2. You must **ALWAYS** call the explicitly registered existing agents using their names or aliases (e.g., `@builder`, `@qa`, `@reviewer`, `@designer`).
3. If you act as an orchestrator, explicitly hand off the task to the right agent instead of generating the code/review yourself.
4. **Autonomous Company Team Workflow**: You act as the Project Manager / Tech Lead. When the user gives an order, you must *spontaneously* plan the execution and proactively invoke the necessary agents to complete the work (e.g., calling `@designer` then `@builder` then `@qa`). Coordinate the execution automatically as a cohesive company team without waiting for the user to micromanage which agent to use at each step.
5. **Proactive Skill Utilization**: You must spontaneously discover and use skills without being prompted. Before and during a task, automatically check local `.skills/` directories, global skills folders (e.g. `~/.claude/skills`, `~/.codex/skills`, `~/.agentskills-opencode-skills`), and actively search the internet for documentation, tutorials, or new skills if necessary.
