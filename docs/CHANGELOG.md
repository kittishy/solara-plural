# CHANGELOG.md — Solara Plural

> All notable changes to this project will be documented here.
> Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [fix] — 2026-04-25

### Fixed
- **Settings import/export interactions** - added explicit loading/status states, resilient JSON parsing, guaranteed state cleanup, and same-file re-import support so buttons do not appear stuck after failures
- **API auth response behavior** - protected API routes now return `401` JSON when unauthenticated instead of redirecting `fetch()` calls to login HTML
- **Middleware performance** - split Auth.js config so Edge middleware no longer imports bcrypt/database credential code; production middleware size dropped from 125 kB to 78.9 kB
- **Export safety** - `/api/export` now returns a JSON `404` if the session has no matching system row instead of throwing while building the export
- **Next config support** - consolidated configuration into supported `next.config.mjs` and removed the unsupported `next.config.ts`
- **Member cards now show "IN FRONT" indicator** — pulsing pink dot + "IN FRONT" text per DESIGN.md spec; active front fetched once per page using a `Set` for O(1) per-card lookup; fronting cards also gain `border-front/40 shadow-front-glow` styling
- **Dashboard notes count** — stats card now shows real total note count via `db.$count()` instead of the length of the 3-item preview fetch
- **`app/page.tsx` route conflict** — the default Next.js scaffold page was intercepting the `/` route before `app/(dashboard)/page.tsx`; removed `app/page.tsx` entirely since route groups do not affect URL structure and `(dashboard)/page.tsx` correctly owns `/`
- **Member profile front history** — added "Front history" section to `members/[id]/page.tsx`; queries last 10 front entries where this member's ID appears in `memberIds` using SQLite `LIKE`; shows date, time range, duration badge, note (if any), pulsing "Now" indicator for active sessions, warm empty state

## [Unreleased]

### Added
- Front history editing UI with retroactive entry creation and per-entry edit flows
- Front history API routes for retroactive creation and per-entry updates
- Initial `public/manifest.json` for the existing app metadata manifest reference
- Non-interactive ESLint setup with `.eslintrc.json`, `eslint`, and `eslint-config-next`
- `npm test`, `cleanup:dupes`, and `cleanup:dupes:apply` scripts
- Node tests for duplicate-member cleanup helper behavior
- Vercel maintenance guidance for dry-run cleanup before destructive duplicate deletion
- README replaced with Solara-specific setup, stack, privacy, documentation, and Vercel deployment guidance
- REFERENCE_RESEARCH.md with Sheaf and comparable-project findings
- VERCEL_DEPLOYMENT.md with Vercel/Turso environment, build, migration, privacy, and verification checklist
- Reference-informed roadmap items for editable front history, retroactive front entries, custom fields, groups/subsystems, front tiers, sharing roles, and privacy labels
- Known issues for lint interactivity, missing manifest, broad image host policy, and roadmap drift
- Initial project orchestration and planning

### Changed
- Removed the broad Next image optimizer allowlist for all HTTPS hostnames
- `scripts/cleanup-dupes.cjs` now defaults to dry-run and requires `--apply` before deleting rows
- Front-history note rendering now escapes quote characters for ESLint compliance
- Front history page now loads through a dedicated client editor component

### Security
- Documented `npm audit --omit=dev` production vulnerabilities in Next.js 14 as a separate upgrade-planning issue instead of applying a breaking Next 16 force upgrade
- docs/PLAN.md — orchestration plan with project type, routing and quality gates
- MASTER_CONTEXT.md — source of truth document
- DECISIONS.md — architectural decisions (D001–D007)
- ARCHITECTURE.md — full system architecture with folder structure
- DESIGN.md — complete design system (colors, typography, components)
- ROADMAP.md — MVP and future roadmap
- DATA_MODEL.md — database schema documentation
- IDEAS.md — future feature ideas
- KNOWN_ISSUES.md — issue tracking template
- UX_NOTES.md — UX principles and patterns
- CHANGELOG.md — this file

### Decided
- Database: Turso (libSQL) over local SQLite
- ORM: Drizzle ORM over Prisma
- Auth: NextAuth.js v5 with Credentials provider
- Framework: Next.js 14 App Router
- Styling: Tailwind CSS v3 with custom warm design tokens

---

## [0.0.1] — 2026-04-25

- Project conception and planning phase initiated
- Working directory established: `F:\Solara\coding\Solara Plural`

---
