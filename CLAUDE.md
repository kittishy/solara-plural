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
