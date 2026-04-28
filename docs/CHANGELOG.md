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
- **Member cards now show "IN FRONT" indicator** — pulsing pink dot + "IN FRONT" text per PROJECT_STYLE_GUIDE.md spec; active front fetched once per page using a `Set` for O(1) per-card lookup; fronting cards also gain `border-front/40 shadow-front-glow` styling
- **Dashboard notes count** — stats card now shows real total note count via `db.$count()` instead of the length of the 3-item preview fetch
- **`app/page.tsx` route conflict** — the default Next.js scaffold page was intercepting the `/` route before `app/(dashboard)/page.tsx`; removed `app/page.tsx` entirely since route groups do not affect URL structure and `(dashboard)/page.tsx` correctly owns `/`
- **Member profile front history** — added "Front history" section to `members/[id]/page.tsx`; queries last 10 front entries where this member's ID appears in `memberIds` using SQLite `LIKE`; shows date, time range, duration badge, note (if any), pulsing "Now" indicator for active sessions, warm empty state

## [Unreleased]

### Added
- System avatar persistence fields (`avatarMode`, `avatarEmoji`, `avatarUrl`) plus migration `0004_safe_hummingbird.sql`
- New account profile API: `GET/PUT /api/account/profile`
- Settings profile controls for system avatar mode (emoji preset or image URL), including catbox upload support via `POST /api/upload`
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
- Member profile `Edit profile` action now uses a clearer warm CTA style (higher contrast, larger touch target, stronger hover/focus affordance) on mobile and desktop without changing page structure
- Front tracker mobile `Choose members` trigger now has clearer tap affordance with explicit open/close label, action cue icon, expansion indicator, and helper text while preserving the existing selector behavior and multi-selection flow
- Settings appearance now uses preset themes only; removed the `Custom colors (local)` UI and its local override logic
- Added a new gray preset theme (`Mist Gray`) to `SOLARA_THEMES` with full token coverage for Settings and Sidebar selection
- Settings profile avatar now supports image upload through `POST /api/upload` (catbox flow), with inline upload feedback and automatic `avatarUrl` fill while preserving emoji avatar mode
- Front tracker mobile member selection now uses a compact collapsible multi-select with search and scroll-friendly list behavior, keeping multi-member front selection intact
- `Session details > Selected members` chips now render member avatar miniatures when available, with warm initial/color fallback when not
- Dashboard current-front chips now show member avatar thumbnails when available (fallback remains color + initial)
- Front history editor member picker now loads all active system members, not only members already present in prior history entries
- Friends list action label changed from `Sharing` to `Privacy` (and `Hide privacy` when expanded)
- Friends payload now includes avatar fields for connected accounts, and connected-friend cards render avatar when available
- Removed the broad Next image optimizer allowlist for all HTTPS hostnames
- `scripts/cleanup-dupes.cjs` now defaults to dry-run and requires `--apply` before deleting rows
- Front-history note rendering now escapes quote characters for ESLint compliance
- Front history page now loads through a dedicated client editor component
- Front tracker now uses a dashboard-style flow with searchable member picker, selected-member summary, and clearer session actions for mobile and desktop
- Mobile bottom navigation now uses a glassmorphism shell and animated active bubble to improve transition feel between sections
- Mobile dashboard now acts as a navigation/action hub with larger touch targets, clearer first-screen actions, and less dense stacked content
- Front tracker mobile hierarchy was refined around a single primary task: choose members, review selected chips, then start or switch front
- Notes editor now separates title/body more clearly, keeps local drafts, warns before accidental unload, and shows save/error status for safer use during switches or dissociation
- Sidebar personalization now uses system-centered language, offers more symbols, and exposes useful system shortcuts instead of generic brand actions
- Front empty state and front-history back navigation now use clearer accessible language and intentional visual affordances

### Security
- Documented `npm audit --omit=dev` production vulnerabilities in Next.js 14 as a separate upgrade-planning issue instead of applying a breaking Next 16 force upgrade
- docs/PLAN.md — orchestration plan with project type, routing and quality gates
- MASTER_CONTEXT.md — source of truth document
- DECISIONS.md — architectural decisions (D001–D007)
- ARCHITECTURE.md — full system architecture with folder structure
- PROJECT_STYLE_GUIDE.md — complete design system (colors, typography, components)
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


## [feature] - 2026-04-27

### Added
- Friendship data model with `system_friend_requests` and `system_friendships`
- `Friends` dashboard page with invite, incoming requests, outgoing requests, and connected friend list
- Social APIs: `GET/POST /api/friends` and `POST /api/friends/requests/[id]`
- Account-type API: `PUT /api/account/type`
- Support for singlet registration and session/account typing (`system` or `singlet`)
- NextAuth type augmentation for `accountType` on `User`, `Session`, and `JWT`

### Changed
- Registration now supports choosing between `system` and `singlet` account types
- Settings now show account type and allow singlet-to-system self-upgrade
- Sidebar, mobile nav, dashboard shortcuts, and prefetch flow now include `Friends`
- Export JSON now includes account type and social relationship data (`version: 2`)

## [feature] - 2026-04-27 (social hardening)

### Added
- Unfriend endpoint: `DELETE /api/friends/[friendSystemId]`
- Directional block endpoints:
  - `POST /api/friends/blocks`
  - `DELETE /api/friends/blocks/[blockedSystemId]`
- Per-member sharing API:
  - `GET /api/friends/sharing/[friendSystemId]`
  - `PUT /api/friends/sharing/[friendSystemId]`
- New tables: `system_blocks`, `system_friend_member_shares`
- Real-flow validator script: `scripts/validate-friends-flow.cjs`

### Changed
- `GET /api/friends` now includes block state (`blockedByMe`, `blockedMe`)
- Invite flow blocks requests when either direction is blocked
- Accept request flow rejects when either direction is blocked
- Blocking now removes friendship, pending requests, and sharing settings for that pair
- Friends UI now supports unfriend, block/unblock, and per-member sharing controls
- Export JSON now includes social blocks/member-sharing and bumped to `version: 3`

### Verified
- Migration applied successfully with `npm run db:migrate`
- End-to-end social flow validated with two real accounts via `scripts/validate-friends-flow.cjs`
