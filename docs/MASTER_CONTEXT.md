# MASTER_CONTEXT.md — Solara Plural

> Source of truth for the entire project. Read before every decision.

---

## 1. Visão geral
Create a web fork of Simply Plural, hosted on Vercel. Recreate core Simply Plural functionality in a modern, editable, expandable web app with an open architecture for future changes. Initially used by two plural systems who are close friends. Start small, intimate, functional, and well-structured.

## 2. Intenção principal
A web version of Simply Plural as a safe space for plural systems to organize. Track members, front, internal info, history. Simple, beautiful, reliable. Build a functional base similar to Simply Plural but as a web app deployable to Vercel with evolvable code.

## 3. Contexto de uso
- System 1: own use
- System 2: best friend's system
- Future: some friend/sharing/selective visibility between systems
- Focus now: private use, internal organization, front tracking, members, history, notes, solid technical base

## 4. Plataforma
- Hosted on Vercel
- Responsive desktop + mobile
- Usable as web/app
- Future PWA-ready
- VSCode-editable
- No closed platforms
- Simple architecture to understand and expand

## 5. Stack
- TypeScript
- React
- Next.js 14 (App Router)
- Turso (libSQL) — SQLite-compatible, serverless-friendly
- Tailwind CSS v3
- Drizzle ORM
- NextAuth.js v5

## 6. SQLite + Vercel Note
Vercel's serverless environment doesn't support local persistent SQLite.
**Chosen solution: Turso (libSQL)** — see DECISIONS.md D001 for full justification.

## 7. Referência funcional (Simply Plural features)
- Member registration + profiles
- Pronouns, avatar, description, tags
- Groups/categories
- Front tracking (multiple members in front simultaneously)
- Front history
- Notes
- Settings
- Import/export JSON data
- Future: system-to-system connections

## 8. MVP
1. Simple auth or clear separation between two systems
2. System registration
3. Member registration
4. Member profile
5. Current front tracking
6. Front history
7. Internal notes
8. Member import via JSON
9. Data export via JSON
10. Responsive layout
11. Functional Vercel deploy

## 9. Data Model (conceptual)
```ts
System {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

Member {
  id: string;
  systemId: string;
  name: string;
  pronouns?: string;
  avatarUrl?: string;
  description?: string;
  color?: string;
  role?: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

FrontEntry {
  id: string;
  systemId: string;
  memberIds: string[];
  startedAt: Date;
  endedAt?: Date;
  note?: string;
  createdAt: Date;
}

SystemNote {
  id: string;
  systemId: string;
  memberId?: string;
  title?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 10. Agent Operations
- Always use skills and agents
- Consult MASTER_CONTEXT.md and DESIGN.md before every decision
- Document everything in: DECISIONS.md, ROADMAP.md, CHANGELOG.md, ARCHITECTURE.md, UX_NOTES.md, DATA_MODEL.md, IDEAS.md, KNOWN_ISSUES.md
- Preserve the soul of Simply Plural: warmth, accessibility, humanity, privacy
- External reference research is tracked in REFERENCE_RESEARCH.md. Use it before adding features inspired by Sheaf, PluralKit, PluralSpace, Plural Star, SElves, or imPlural.
- Vercel deployment context is tracked in VERCEL_DEPLOYMENT.md. Use it before changing environment variables, database setup, auth callbacks, build config, or deployment flow.

## 11. Critical Rules for All Agents
1. ALWAYS consult MASTER_CONTEXT.md before any decision
2. ALWAYS consult DESIGN.md before any UI decision — it already exists, DO NOT create it
3. Document every significant decision in the appropriate .md file
4. Never build cold, clinical UI — this is a warm, human, safe space
5. Prioritize accessibility and mobile experience
6. Keep code clean, typed (TypeScript), and expandable
7. Every feature must serve the plural community's real needs

## 12. Design System Rules (CRITICAL)
- The file `DESIGN.md` at the project root is the ONLY design source of truth
- It follows the `design-md` skill format — load that skill to understand the format
- NEVER generate a new `DESIGN.md`. If you are about to create one, STOP and read the existing file
- NEVER overwrite `DESIGN.md` with a generic template — the real system design is already there
- To add design tokens or patterns, EDIT the existing DESIGN.md file
- Workflow before any UI task: (1) load `design-md` skill, (2) read `DESIGN.md`, (3) build UI

## 13. Reference-informed Direction
- Sheaf is the strongest architecture and privacy reference, but Solara must not copy Sheaf code or inherit AGPL obligations accidentally.
- Keep Solara Vercel-first for now: Next.js, Turso/libSQL, Drizzle, Auth.js.
- Borrow patterns: privacy honesty, import/export as core, custom fields, groups/subsystems, account deletion, API clarity, and trust-model documentation.
- Do not claim end-to-end encryption with the current server-backed architecture.
- The first public-facing path should be small and reliable, not a large hosted community platform.
