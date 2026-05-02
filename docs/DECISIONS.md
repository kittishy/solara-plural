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

## [2026-04-27] D013 - Dual Account Types: `system` and `singlet`

**Decision:** Keep a single `systems` auth table for MVP, but add `accountType` (`system` or `singlet`) so trusted friends can join with a simpler profile and later self-upgrade.

**Justification:**
- Preserves current auth/session architecture and avoids a disruptive user-table split.
- Supports the project's social/friendship mission immediately.
- Allows singlet onboarding without forcing plural-specific setup at signup.
- Keeps self-identification flexible: singlet accounts can become system accounts in Settings.

**Implementation:**
- Added `systems.account_type` defaulting to `system`.
- Registration now accepts account type.
- Added `PUT /api/account/type` for self-managed account-type updates.
- Session/JWT now include `accountType`.

---

## [2026-04-27] D014 - Friendship Model: Requests + Canonical Pair

**Decision:** Implement social connections with:
1. `system_friend_requests` for pending/accepted/declined/canceled invites.
2. `system_friendships` for established relationships, stored as a canonical ID pair (`systemAId`, `systemBId`) with a unique index.

**Justification:**
- Keeps consent explicit and auditable.
- Prevents duplicate friendship rows by enforcing one canonical pair per relationship.
- Supports system-to-system, singlet-to-system, and singlet-to-singlet connections using the same model.

**Implementation:**
- Added `GET/POST /api/friends` for listing and sending requests.
- Added `POST /api/friends/requests/[id]` for accept/decline/cancel.
- Added `/friends` dashboard page and navigation integration.
- Export payload now includes social data (`friendRequests`, `friendships`) and account type.

---

## [2026-04-27] D015 - Safety Layer for Social: Directional Block + Explicit Unfriend

**Decision:** Add a directional blocking model and a dedicated unfriend operation on top of friendship requests.

**Justification:**
- Some relationships need a clear safety boundary that is stronger than "decline request".
- Directional blocks preserve autonomy: each account controls who can contact it.
- Unfriend and block must clean up sharing links to avoid stale access expectations.

**Implementation:**
- Added `system_blocks` with unique directional pair (`blockerSystemId`, `blockedSystemId`).
- Added `DELETE /api/friends/[friendSystemId]` for unfriend.
- Added `POST /api/friends/blocks` and `DELETE /api/friends/blocks/[blockedSystemId]`.
- Invites and request acceptance now fail when either side is blocked.
- Blocking removes friendship, pending requests, and sharing rows for that pair.

---

## [2026-04-27] D016 - Per-member Sharing Permissions (Social Phase)

**Decision:** Introduce per-member sharing permissions between connected friends using visibility levels.

**Justification:**
- Trust is not all-or-nothing; systems need fine-grained control per member.
- Keeps the project aligned with warmth, consent, and reversibility.
- Enables future role/field-level privacy evolution without a full redesign.

**Implementation:**
- Added `system_friend_member_shares` keyed by (`ownerSystemId`, `friendSystemId`, `memberId`).
- Visibility levels currently: `hidden`, `profile`, `full`.
- Added `GET/PUT /api/friends/sharing/[friendSystemId]`.
- Owner-only enforcement: only the member owner can configure sharing for their members.

---

## [2026-04-27] D017 - Field-level Sharing Visibility + Validation Data Cleanup

**Decision:** Extend social sharing from per-member-only visibility to per-field visibility, and add a dedicated maintenance script to clean validation accounts safely.

**Justification:**
- Social privacy needs granular consent (field-by-field), not only member-level access.
- Sharing controls should map directly to the existing Friends UI toggles and API payload.
- Validation accounts must be removable with a repeatable, low-risk workflow (dry run first, explicit apply).

**Implementation:**
- Added `system_friend_member_shares.field_visibility` for field-level sharing data.
- `GET/PUT /api/friends/sharing/[friendSystemId]` now handles `fieldVisibility`.
- `FriendsClient` now exposes toggles per field (`pronouns`, `description`, `avatarUrl`, `color`, `role`, `tags`, `notes`).
- Added `scripts/cleanup-validation-data.cjs` and coverage in `scripts/cleanup-validation-data.test.cjs`.
- Added package scripts: `cleanup:validation` (dry run) and `cleanup:validation:apply` (destructive apply).

---

## [2026-04-27] D018 - Usability Cleanup: Notes, Theme Presets, Invite Hardening, Mobile Nav

**Decision:** Prioritize practical UX cleanup based on direct user feedback:
1. remove low-value note chips,
2. replace sidebar shortcuts with real theme presets,
3. harden invite form behavior,
4. improve mobile navigation ergonomics.

**Justification:**
- The chips in the note editor added noise without helping note-writing flow.
- Sidebar shortcuts were cluttered and not aligned with personalization intent.
- Invite UX needed clearer validation and safer request handling to reduce fragile behavior.
- Mobile bottom navigation was too dense on small screens.

**Implementation:**
- Removed decorative chips (`Private note`, `Local draft`, `Editable later`) from the note editor.
- Added theme infrastructure (`lib/theme.ts`) with persistence and document-level application.
- Replaced sidebar shortcuts with theme preset actions and linked to `Settings > Appearance`.
- Added appearance theme picker in Settings.
- Improved invite form validation (normalized email, self-invite guard, timeout handling, inline error).
- Redesigned mobile nav spacing and sizing for better touch targets and narrow screens.

---

## [2026-04-28] D019 - System-level Avatar + Local Custom Theme Controls

**Decision:** Add a first-class system avatar model (emoji preset or image URL) and expose lightweight local custom theme color controls while keeping preset themes as the default path.

**Justification:**
- The system identity marker in navigation should be user-controlled and consistent across Settings, sidebar brand area, and friend lists.
- Friends need a recognizable profile marker when available, with graceful fallback when not set.
- Theme presets are still the primary UX, but users requested basic personalization beyond fixed presets.

**Implementation:**
- Added `systems.avatarMode`, `systems.avatarEmoji`, and `systems.avatarUrl`.
- Added `GET/PUT /api/account/profile` for account profile + avatar persistence.
- Updated Settings profile UI with avatar mode switch, emoji presets, URL input, and preview.
- Extended `GET /api/friends` payload with friend avatar fields.
- Added local custom theme color controls (primary, surface, background) layered on top of preset themes.

---

## [2026-04-29] D020 - Inline Compressed Avatar Storage

**Decision:** Store uploaded avatar images as compressed inline `data:image` values for profile/member avatars instead of relying on Catbox for this flow. Prefer WebP when the browser supports it, with JPEG as a fallback.

**Justification:**
- Catbox rejected production uploads from the Vercel route with `HTTP 412: Invalid uploader`.
- Avatar images do not need full-resolution external hosting; a small compressed image is enough for UI use.
- Keeping avatar upload local to the app removes a fragile third-party dependency from the profile setup flow.

**Implementation:**
- Added client-side avatar compression to a 512px WebP data URL, with JPEG fallback.
- Settings and member avatar upload now use the compressed data URL directly.
- Account profile validation accepts safe image data URLs up to a bounded size.

---

## [2026-04-29] D021 - Friend List Shows Only Relevant Shared Front Context

**Decision:** Keep the Friends list lightweight by showing current-front context only when it is relevant and available for system friends. Do not show plural-specific empty states for singlet friends, shared-member empty states, or "accounts blocking you" status.

**Justification:**
- Friend cards should answer "who am I connected to?" without creating emotional discomfort or unnecessary social exposure.
- Current front visibility is useful for system friends, but empty front/member states are noise in the list view.
- Blocking visibility can feel negative and should not be surfaced as a passive dashboard panel.

**Implementation:**
- Extended `GET /api/friends` with `sharedMembers` and `currentFront` summaries.
- Filtered shared members and fronting members through `system_friend_member_shares` and field-level visibility.
- Updated `FriendsClient` to render a current-front strip only for system friends with a visible active front.
- Removed shared-member empty state cards from the friend list and removed the "Accounts blocking you" panel.

---

## [2026-04-29] D022 - Safer Settings Account Controls

**Decision:** Add bidirectional account type switching and schedule account deletion behind a 72-hour recovery window instead of immediate deletion.

**Justification:**
- Users may need to move between singlet and system account modes as self-understanding changes.
- Changing from system to singlet deserves an explicit warning because system-specific data may be hidden, changed, or removed by future behavior.
- Account deletion must protect users during distress by requiring deliberate confirmation and giving time to recover.

**Implementation:**
- Added `deletionRequestedAt` and `deletionScheduledFor` fields to `systems`.
- Added `DELETE /api/account/deletion` to schedule deletion after typing the account email and acknowledging the 72-hour recovery window.
- Added `POST /api/account/deletion` to cancel scheduled deletion.
- Added `scripts/purge-scheduled-deletions.cjs` as a dry-run-first purge mechanism for accounts past the recovery window.
- Updated Settings with account type controls, a system-to-singlet warning panel, and a guarded deletion/recovery section.
- Updated Mist Gray theme tokens and CSS variables so it is visually distinct from Night Bloom.

---

## [2026-05-02] D027 - Automatic i18n via locale-prefixed URLs + middleware negotiation

**Decision:** Implement automatic internationalization using locale-prefixed URLs (`/en/*`, `/pt-BR/*`, `/es/*`) resolved by middleware, with server-side language negotiation (`Accept-Language`) and persistent preference via cookie/local storage.

**Justification:**
- Locale-prefixed URLs make language state explicit, shareable, and production-safe for server rendering.
- Middleware-based negotiation allows first visit language detection before UI hydration.
- Cookie persistence respects user choice across sessions and devices where browser settings differ.
- Keeping the existing translation dictionary/provider avoids adding new dependencies and keeps the implementation aligned with current stack conventions.

**Implementation:**
- Added robust i18n helpers in `lib/i18n.ts` for language normalization, `Accept-Language` parsing, locale path handling, and fallback behavior.
- Updated `middleware.ts` to:
  - redirect non-localized routes to locale-prefixed routes,
  - detect language from `solara.locale` cookie or `Accept-Language`,
  - rewrite localized routes back to internal app routes,
  - persist locale cookie.
- Updated `LanguageProvider` to sync language with URL locale and persist preference in both cookie and `localStorage`.
- Updated root layout boot script to honor locale from URL first, with stored language as fallback.

---

## [2026-05-01] D023 - Preview-first PluralKit and Simply Plural Member Sync

**Decision:** Add PluralKit and Simply Plural member sync as a preview-first pull integration with stable external identity links. Do not add bidirectional remote writes or automatic deletion in this slice.

**Justification:**
- Many accounts already imported members from PluralKit or Simply Plural, so name-only importing would create duplicates.
- External provider tokens are sensitive and should not be stored for this first production-safe integration.
- PluralKit and Simply Plural have different front/history models; member identity linking is the safest first foundation before any future front sync.
- Preview/apply lets users see create/update/link/skip counts before changing local data.

**Implementation:**
- Added `member_external_links` with unique provider/external and member/provider constraints.
- Added `POST /api/integrations/member-sync` for PluralKit and Simply Plural member preview/apply.
- PluralKit reads members with required `User-Agent`; Simply Plural supports production and pretesting base URLs.
- Added merge planner tests covering external links, Simply Plural `pkId` to PluralKit cross-linking, ambiguous names, non-overwrite defaults, and duplicate remote names.
- Added Settings UI for tokens, provider selection, preview/apply, cautious sync options, and summary output.
- Hardened current front member validation and export JSON parsing around integration-adjacent data.

---

## [2026-05-02] D024 - Remove Simply Plural Token Integration From Production Sync

**Decision:** Remove Simply Plural from the active member sync integration and keep only PluralKit preview/apply flow.

**Justification:**
- Simply Plural token access is no longer viable for users, making the integration path non-operational.
- Keeping a non-functional token flow in production settings increases confusion and support risk.
- Restricting to PluralKit preserves the existing duplicate-safe sync planner without introducing unstable fallback behavior.

**Implementation:**
- Removed Simply Plural fields and actions from Settings integrations UI.
- Removed Simply Plural provider handling from `POST /api/integrations/member-sync`.
- Removed Simply Plural mapper/types/tests from the member sync core slice.
- Kept dedupe/link protections and preview-first flow intact for PluralKit.

---

## [2026-05-02] D025 - Apply-mode PluralKit Sync Also Updates Current Front

**Decision:** Extend PluralKit member sync so `apply: true` also syncs the current front state end-to-end, while keeping preview mode member-only.

**Justification:**
- Users asked for practical automation where local front status follows what they already maintain in PluralKit.
- Reusing the existing explicit apply action keeps this behavior consent-based (no background polling or hidden writes).
- Current-front sync can be implemented safely from existing identity links without introducing front-history import complexity.

**Implementation:**
- `POST /api/integrations/member-sync` now fetches `GET /systems/@me/fronters` when `apply: true`.
- After applying member operations, route now maps fronting external IDs through `member_external_links` and updates `front_entries`.
- Behavior:
  - If PluralKit has fronters with linked local members: end active front and start a synced current front.
  - If PluralKit has no fronters: end local active front.
  - If no linked local members are found: skip front update and report reason.
- Settings integration summary now shows a front-sync status line for applied syncs.

---

## [2026-05-02] D026 - Harden Integration Link Metadata to Prevent Secret Persistence

**Decision:** Restrict `member_external_links.metadata` to an allowlisted provider-safe payload instead of blindly persisting arbitrary provider metadata.

**Justification:**
- Integration tokens are intentionally request-only and must never be persisted in DB rows.
- Even when current provider mappers do not include tokens, defensive allowlisting prevents future regressions if upstream payload shapes or mapper behavior change.
- This is a low-impact hardening step: no schema change, no API contract change, and no sync UX disruption.

**Implementation:**
- Updated `lib/integrations/member-sync-core.js` to sanitize link metadata per provider before serialization.
- PluralKit metadata now stores only explicit safe fields (`shortId`, `uuid`, `displayName`, `birthday`, optional `externalPluralKitId`).
- Added regression coverage in `scripts/member-sync-core.test.cjs` to ensure token-like keys are dropped from stored metadata.

---

## [2026-05-02] D027 - Persist PluralKit Token Only as Encrypted Credential

**Decision:** Allow token reuse for PluralKit sync, but persist credentials only in encrypted form via `system_integrations.encrypted_token`.

**Justification:**
- Re-entering integration tokens on every sync adds friction and increases user error.
- Persisting plaintext tokens would create an unacceptable exposure risk in DB snapshots and manual queries.
- App-layer encryption at rest is a low-impact improvement compatible with current Turso/libSQL stack and existing sync route.

**Implementation:**
- Added `system_integrations` table (`system_id`, `provider`, `encrypted_token`) with uniqueness per system/provider.
- `POST /api/integrations/member-sync` now:
  - accepts explicit token input,
  - encrypts and upserts it for future reuse,
  - falls back to decrypting stored token when request token is omitted.
- Encryption uses AES-256-GCM in `lib/integrations/token-crypto.ts` with `INTEGRATIONS_TOKEN_SECRET` (or `NEXTAUTH_SECRET` fallback).
- API responses and export payloads do not expose decrypted tokens.

---
