# DECISIONS.md — Solara Plural

> Architectural and technical decisions for the Solara Plural project.
> Every significant decision must be recorded here with justification.

---

## [2026-04-25] D001 — Database Solution: Turso (libSQL)

**Decision:** Use **Turso** (libSQL) as the database layer.

**Evaluated Options:**
| Option | Pros | Cons |
|--------|------|------|
| Turso/libSQL | SQLite-compatible API, serverless-friendly, free tier, edge-ready, Drizzle support | Requires account/token |
| Neon (Postgres) | Fully managed, generous free tier | Not SQLite-compatible, diverges from original intent |
| PlanetScale | Serverless MySQL | Not SQLite, pricing changes |
| Local SQLite on Vercel | Simple | ❌ Not persistent on serverless — ephemeral filesystem |
| Supabase | Full platform | Overkill for small intimate app |

**Justification:**
- Turso is SQLite-compatible, meaning our schema is portable and familiar
- Works perfectly with Vercel serverless (HTTP-based connections)
- Drizzle ORM has first-class Turso support via `@libsql/client`
- Free tier is sufficient for 2 systems + close friends
- Data remains ours, not locked into proprietary platforms
- Can migrate to self-hosted libSQL server in the future

**Implementation:** `@libsql/client` + Drizzle ORM

---

## [2026-04-25] D002 — ORM: Drizzle ORM

**Decision:** Use **Drizzle ORM** (not Prisma).

**Justification:**
- Drizzle has native libSQL/Turso support
- Lightweight, TypeScript-first, no heavy CLI dependency
- Schema is plain TypeScript — easy to read and edit in VSCode
- Better edge/serverless compatibility than Prisma
- Migrations are simple and transparent
- Prisma's binary dependency is problematic on Vercel edge functions

---

## [2026-04-25] D003 — Framework: Next.js 14 App Router

**Decision:** Use **Next.js 14** with the **App Router**.

**Justification:**
- App Router is the modern Next.js standard
- Server Components reduce client-side JS
- Route Handlers replace API routes cleanly
- Layouts enable persistent sidebar/nav
- Future PWA and edge support built-in
- Vercel deployment is native and zero-config

---

## [2026-04-25] D004 — Authentication: NextAuth.js v5 (Auth.js)

**Decision:** Use **NextAuth.js v5** (Auth.js) with **Credentials provider** for MVP.

**Auth Strategy:**
- Each system has its own account (email + password)
- Sessions stored in JWT (no database sessions needed for MVP)
- Two hardcoded systems initially, migrating to DB-backed users
- Future: magic links, passkeys, system-to-system sharing tokens

**MVP Auth Flow:**
1. User visits `/login`
2. Enters system email + password
3. JWT session created — contains `systemId`
4. All API routes and pages gate on `systemId`

**Security notes:**
- Passwords hashed with bcrypt
- JWT signed with `NEXTAUTH_SECRET`
- All sensitive routes protected via middleware

---

## [2026-04-25] D005 — Styling: Tailwind CSS v3

**Decision:** Use **Tailwind CSS v3** with a custom warm design token set.

**Justification:**
- Utility-first: fast iteration
- Custom color tokens for warm palette
- Responsive utilities built-in
- Works perfectly with Next.js

---

## [2026-04-25] D006 — State Management: React Context + SWR

**Decision:** Use **React Context** for auth/system state, **SWR** for data fetching.

**Justification:**
- SWR provides caching, revalidation, and optimistic updates
- No heavy Redux needed for this scope
- Context for global user/system identity
- Simple, maintainable, expandable

---

## [2026-04-25] D007 — Import/Export: JSON via API Route

**Decision:** Import/export system data as **JSON files** via dedicated API routes.

**Format:** Compatible with Simply Plural export format where possible.

---

## [2026-04-25] D008 - Edge-safe Auth Split

**Decision:** Split Auth.js configuration into:
- `lib/auth/edge-config.ts` for middleware-safe session/pages/callback config
- `lib/auth/config.ts` for Node-only Credentials provider, database lookup, and bcrypt password checks

**Justification:**
- Middleware runs in the Edge runtime and must not import `bcryptjs` or database-heavy credential logic.
- Keeping bcrypt out of middleware removes Edge runtime warnings and reduces middleware bundle size.
- API routes and pages still use the full auth config when they need real credential verification.

---

## [2026-04-25] D009 - API Auth Should Return JSON

**Decision:** Protected API routes return `401` JSON from middleware when unauthenticated, while protected pages still redirect to `/login`.

**Justification:**
- Client-side `fetch()` calls should not receive login-page HTML.
- Settings import/export can show clear inline errors instead of appearing unresponsive.
- Page navigation remains friendly for normal browser visits.

---

## [2026-04-25] D010 - Use Sheaf As Reference, Not As Codebase

**Decision:** Use Sheaf as a product, architecture, and privacy reference, but do not copy Sheaf source code into Solara.

**Justification:**
- Sheaf has strong patterns for plural-system tracking, import/export, privacy documentation, custom fields, groups, front tracking, account deletion, and self-hosting.
- Sheaf's stack is FastAPI, PostgreSQL, Redis, Docker Compose, and React/Vite. Solara's initial goal is a smaller Vercel-hosted Next.js app with Turso/libSQL.
- Sheaf is AGPL-3.0-or-later. Copying implementation code could create licensing obligations that are not part of Solara's current plan.

**Implementation:** Track Sheaf-derived insights in `docs/REFERENCE_RESEARCH.md` and translate them into Solara-specific specs before coding.

---

## [2026-04-25] D011 - Honest Trust Model Before Advanced Sharing

**Decision:** Solara will document its server-backed trust model and will not claim end-to-end encryption unless the architecture changes.

**Justification:**
- Solara is intended to run on Vercel with a Turso database.
- The server/runtime must read application data to render pages, search, import, export, and manage front state.
- Operators with access to database data and secrets may technically access sensitive content.
- Honest privacy language is safer than promising protections the architecture does not provide.

**Implementation:** Keep privacy notes in `README.md`, `docs/REFERENCE_RESEARCH.md`, and `docs/VERCEL_DEPLOYMENT.md`. Avoid logging sensitive data or placing it in URLs.

---

## [2026-04-25] D012 - Vercel-first Initial Deployment

**Decision:** Keep the initial deployment path optimized for Vercel plus Turso/libSQL.

**Justification:**
- The project goal explicitly starts as a Vercel-hosted site.
- Current code already uses Next.js App Router, route handlers, Auth.js, Drizzle, and libSQL.
- Moving to a Sheaf-like Docker/Postgres/Redis architecture would slow down the private MVP and increase operational burden.

**Implementation:** Use `docs/VERCEL_DEPLOYMENT.md` as the deployment checklist. Revisit self-hosting only after the MVP is stable.

---
