# Solara Plural — Agent Instructions

> **READ THIS BEFORE ANY ACTION.** This file is the mandatory entry point for ALL coding agents (Codex, OpenCode, Claude, Gemini, etc.).

---

## 1. Mandatory Context Files

Before any decision, read these files IN ORDER:

1. `docs/MASTER_CONTEXT.md` — Project vision, stack, MVP, data model, rules
2. `docs/PROJECT_STYLE_GUIDE.md` — Design system (DESIGN.md format). **NEVER overwrite or recreate this file.**
3. `docs/ARCHITECTURE.md` — Technical architecture
4. `docs/DATA_MODEL.md` — Database schema and relationships
5. `docs/DECISIONS.md` — Decision log (append new decisions here)
6. `docs/VERCEL_DEPLOYMENT.md` — Deployment configuration
7. `docs/ROADMAP.md` — Feature roadmap
8. `docs/KNOWN_ISSUES.md` — Known bugs and workarounds

---

## 2. Local Skills (CRITICAL — USE THESE)

This repository contains a local copy of ALL skills in `.skills/`. **You MUST read and use these skills when they are relevant to the task.**

### How to use skills

1. Browse `.skills/` to find relevant skills for your current task
2. Read the `SKILL.md` file inside each skill directory
3. Follow the skill's instructions precisely
4. If a skill has a `references/` subdirectory, read those files too when needed

### Skills Catalog

#### Design & UI
- **design-md** → `.skills/design-md/SKILL.md` — DESIGN.md format spec. **USE THIS before any UI work.**
- **frontend-design** → `.skills/frontend-design/SKILL.md` — Anthropic frontend design patterns
- **frontend-skill** → `.skills/frontend-skill/SKILL.md` — Landing pages, websites, app UIs
- **mobile-ui-design** → `.skills/mobile-ui-design/SKILL.md` — Mobile-first UI patterns
- **theme-factory** → `.skills/theme-factory/SKILL.md` — Theme toolkit with 10 presets
- **canvas-design** → `.skills/canvas-design/SKILL.md` — Canvas-based design
- **brand-guidelines** → `.skills/brand-guidelines/SKILL.md` — Brand guidelines creation

#### Development & Architecture
- **typed-service-contracts** → `.skills/typed-service-contracts/SKILL.md` — TypeScript Spec+Handler pattern
- **tdd-red-green-refactor** → `.skills/tdd-red-green-refactor/SKILL.md` — Test-driven development
- **mcp-builder** → `.skills/mcp-builder/SKILL.md` — MCP server creation
- **webapp-testing** → `.skills/webapp-testing/SKILL.md` — Playwright web app testing
- **ink** → `.skills/ink/SKILL.md` — Terminal UI rendering

#### Deployment & DevOps
- **vercel-deploy** → `.skills/vercel-deploy/SKILL.md` — Vercel deployment
- **gh-fix-ci** → `.skills/gh-fix-ci/SKILL.md` — GitHub CI debugging
- **gh-address-comments** → `.skills/gh-address-comments/SKILL.md` — PR comment handling
- **yeet** → `.skills/yeet/SKILL.md` — Stage, commit, push, PR in one flow

#### Content & Documents
- **pdf** → `.skills/pdf/SKILL.md` — PDF manipulation
- **pptx** → `.skills/pptx/SKILL.md` — PowerPoint creation/editing
- **xlsx** → `.skills/xlsx/SKILL.md` — Spreadsheet manipulation
- **docx** → `.skills/docx/SKILL.md` — Word document manipulation
- **doc-coauthoring** → `.skills/doc-coauthoring/SKILL.md` — Document co-authoring

#### AI & APIs
- **claude-api** → `.skills/claude-api/SKILL.md` — Anthropic Claude API usage
- **imagegen** → `.skills/imagegen/SKILL.md` — OpenAI Image API
- **skill-creator** → `.skills/skill-creator/SKILL.md` — Create/modify/evaluate skills

#### Marketing & Social
- **marketing-ideas** → `.skills/marketing-ideas/SKILL.md` — SaaS marketing strategies
- **social-content** → `.skills/social-content/SKILL.md` — Social media content creation

#### Browser & Tools
- **agent-browser** → `.skills/agent-browser/SKILL.md` — Browser automation
- **find-skills** → `.skills/find-skills/SKILL.md` — Discover more skills
- **linear** → `.skills/linear/SKILL.md` — Linear issue management

#### Utilities
- **sandeco-token-reduce** → `.skills/sandeco-token-reduce/SKILL.md` — Token/prompt compression
- **web-artifacts-builder** → `.skills/web-artifacts-builder/SKILL.md` — Complex HTML artifacts

---

## 3. Workflow for UI Tasks

1. Read `.skills/design-md/SKILL.md`
2. Read `docs/PROJECT_STYLE_GUIDE.md`
3. Apply design tokens from the style guide
4. Build UI following the design system
5. Test responsiveness (desktop + mobile)

## 4. Workflow for Backend Tasks

1. Read `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`
2. Read `.skills/typed-service-contracts/SKILL.md` if building services
3. Follow TypeScript strict typing
4. Use Drizzle ORM patterns from existing code
5. Document decisions in `docs/DECISIONS.md`

## 5. Workflow for Deployment

1. Read `docs/VERCEL_DEPLOYMENT.md`
2. Read `.skills/vercel-deploy/SKILL.md`
3. Follow the deployment checklist

## 6. Critical Rules

1. **ALWAYS read relevant skills before starting work** — they are in `.skills/`
2. **NEVER overwrite `docs/PROJECT_STYLE_GUIDE.md`** — edit it, don't replace it
3. **Document every significant decision** in `docs/DECISIONS.md`
4. **Keep the UI warm and human** — this is a safe space for plural systems
5. **Prioritize accessibility and mobile experience**
6. **Use TypeScript strict typing** throughout
7. **Test before declaring done**

---

## 7. OpenCode Agents Configuration

To facilitate OpenCode CLI autocomplete (via Tab), the following agents are explicitly registered with short, descriptive names and aliases:

- **builder** (`b`) — Main developer agent. Builds features, writes code, and implements logic.
- **reviewer** (`rev`) — Code reviewer agent. Focuses on code quality, strict TypeScript typing, and architectural consistency.
- **qa** (`qa`) — Quality assurance agent. Runs tests, checks responsiveness, and identifies bugs.
- **designer** (`ui`) — UI/UX agent. Applies the design system, aesthetics, and user experience patterns.
- **deployer** (`dep`) — Deployment agent. Handles Vercel configuration and deployment checks.

---

## 8. STRICT DELEGATION POLICY (Codex-like Behavior)

To ensure the AI system behaves correctly and utilizes specialized agents (like Codex does), rather than attempting to resolve everything in a generic context:
1. **Never create temporary agents on the fly**.
2. **Always invoke existing agents** using their exact names or aliases (e.g., `@builder`, `@qa`, `@reviewer`, `@designer`, `@deployer`).
3. **Orchestrator Role**: If you receive a complex task, break it down and explicitly hand off the respective parts to the registered agents. Do not attempt to bypass them by doing all the specialized work yourself.
4. **Autonomous Company Team Workflow**: Act as the Project Manager / Tech Lead. When receiving an order from the user, *spontaneously* break down the work and proactively invoke the necessary team members (e.g., `@designer`, `@builder`, `@qa`) in sequence. Do not wait for the user to manually trigger each agent; coordinate the execution automatically as a cohesive company team.
5. **Proactive Skill Utilization**: You must spontaneously discover and use skills without being prompted. Before and during a task, automatically check local `.skills/` directories, global skills folders (e.g. `~/.claude/skills`, `~/.codex/skills`, `~/.agentskills-opencode-skills`), and actively search the internet for documentation, tutorials, or new skills if necessary.
