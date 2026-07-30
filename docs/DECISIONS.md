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
- All sensitive dashboard routes protected by server layout/session checks

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

## [2026-05-09] D032 - Keep Auth.js Out of Edge Middleware

**Decision:** Middleware no longer imports `NextAuth`. It handles locale redirects/rewrites only; dashboard layouts and API route handlers enforce authentication.

**Justification:**
- Importing `NextAuth` in middleware pulled `jose` into the Edge bundle and produced unsupported `CompressionStream` / `DecompressionStream` warnings during `next build`.
- API routes already return JSON auth failures through `requireAuth()`.
- Dashboard pages already run through the server layout, which calls the session helper before rendering protected content.

**Implementation:**
- Removed `NextAuth(authConfig)` from `middleware.ts`.
- Kept i18n cookie handling and localized-path rewrites in middleware.
- Verified `npm run build` completes without the previous Edge runtime warnings.

---

## [2026-05-10] D033 - Password Reset Uses Short-lived Hashed Tokens

**Decision:** Add a self-service password reset flow using random one-time tokens stored only as SHA-256 hashes in `password_reset_tokens`.

**Justification:**
- Existing passwords are bcrypt hashes and cannot be recovered or shown safely.
- Reset requests must not reveal whether an email exists.
- Raw reset tokens should only exist in the delivery channel, never in database rows or exports.
- Production delivery is optional through Resend env vars, while local development can show a temporary test link for validation.

**Implementation:**
- Added public `/forgot-password` and `/reset-password` auth pages.
- Added `POST /api/password-reset/request` and `POST /api/password-reset/confirm`.
- Requesting a reset invalidates previous unused reset tokens for that account.
- Successful reset updates `systems.password_hash` and invalidates all unused reset tokens for that account.

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

## [2026-05-02] D028 - Front route is source of truth for outbound PluralKit switch updates

**Decision:** Move the PluralKit front write behavior to the same place where local front state changes (`POST/DELETE /api/front`) and use `POST /systems/@me/switches` for outbound provider updates.

**Justification:**
- The reported production symptom (`Current fronters: (no fronter)`) indicates local front changes were not mirrored to PluralKit at the moment users front/switched out.
- Updating fronters only inside integration apply flow is insufficient because normal front changes happen in `/api/front` and may occur long after member sync.
- PluralKit's official write endpoint for current front is switch creation (`POST /systems/{systemRef}/switches`), including empty `members` for switch-out.

**Implementation:**
- Added `lib/integrations/pluralkit-front-sync.js` as a focused, testable sync helper.
- `POST /api/front` now attempts a best-effort outbound PluralKit switch update after local DB update.
- `DELETE /api/front` now attempts a best-effort outbound PluralKit switch-out.
- Failures are observable via structured logs and response metadata (`pluralKitSync`) without blocking local front persistence.
- Added `scripts/pluralkit-front-sync.test.cjs` coverage for token missing, missing links, provider success, and provider rejection cases.

---

## [2026-05-02] D029 - Partial front mapping should sync mapped members and expose sync diagnostics

**Decision:** Change outbound PluralKit front sync behavior to proceed when mapping is partial (at least one local member maps to an external PluralKit member), and return structured diagnostics for incident debugging.

**Justification:**
- Production reports showed local front changes succeeding while PluralKit remained `(no fronter)` even with a valid token.
- The previous behavior skipped the entire outbound switch whenever any local member lacked a `member_external_links` mapping, causing frequent all-or-nothing failures during mixed-linked fronts.
- Reliability incidents need traceable metadata (`requestId`, provider status, reason code, HTTP status, mapped/unmapped members) without exposing secrets.

**Implementation:**
- Updated `lib/integrations/pluralkit-front-sync.js` to:
  - allow partial mapping sync,
  - skip only when zero members are mapped,
  - return structured result metadata (`providerStatus`, `httpStatus`, `reasonCode`, `mappedCount`, `unmappedIds`).
- Updated `POST/DELETE /api/front` to include safe sync diagnostics and `requestId` in `pluralKitSync` response payload.
- Added structured logs with event/reason/request correlation fields and no token leakage.
- Updated `scripts/pluralkit-front-sync.test.cjs` to cover partial-mapping success and new diagnostic shape.

---

## [2026-05-08] D030 - Harden PluralKit Sync Against API Shape and Rate Limits

**Decision:** Treat PluralKit as the integration contract source: parse `/fronters` as a switch object, preserve ordered fronters, surface rate-limit retry guidance, and avoid redundant switch writes.

**Justification:**
- PluralKit's `/systems/@me/fronters` returns a switch object with `members` and timestamp, not a bare member array.
- PluralKit update endpoints are limited more tightly than reads, so duplicate local front submissions should not create duplicate remote switches.
- Apply-mode member/front sync must not partially persist local data and then report a total failure.

**Implementation:**
- Added `lib/integrations/pluralkit-api.js` for tested PluralKit response parsing and retry-after formatting.
- `POST /api/integrations/member-sync` now parses current fronters from the switch object, stores the remote switch timestamp locally, and commits member/link/front changes in one transaction.
- Front ordering is preserved when applying remote PluralKit front state.
- `POST /api/front` skips outbound PluralKit switch creation when the requested front already matches the active front in the same order.
- Outbound PluralKit switch sync returns `rate_limited` diagnostics for HTTP 429 without automatic retrying.

---

## [2026-05-09] D031 - PWA and Friend Front Notifications Use In-app History First

**Decision:** Add PWA support, native Web Push, saved browser subscriptions, and an in-app notification center. Front-change notifications for friends are persisted in Solara first, with browser push as a best-effort delivery layer.

**Justification:**
- Push notifications are not guaranteed on every browser, device, permission state, or network condition.
- Friend front changes are useful social context, but notification payloads must respect sharing visibility and avoid leaking private member data.
- Persisting notifications in the database gives users a reliable place to review updates even when push is unavailable or blocked.

**Implementation:**
- Added PWA assets: `public/manifest.json`, PNG icons, and `public/service-worker.js`.
- Added native Web Push delivery using VAPID keys and the existing Turso/libSQL database.
- Added `notification_push_tokens`, `notifications`, and `notification_deliveries` tables.
- Added APIs for registering push tokens, listing notifications, marking one notification read, and marking all read.
- Added `/notifications` dashboard page and navigation links.
- `POST/DELETE /api/front` now creates friend front-change notifications after local front persistence, scoped through existing per-member sharing visibility.

---

## [2026-05-10] D032 - Custom Fields Make Member Profiles System-shaped

**Decision:** Add system-scoped custom field definitions in Settings and member-scoped custom field values on member create/edit/profile pages.

**Justification:**
- Plural systems often need profile details that do not fit a fixed app schema.
- A reusable field template lets the system define a fuller ficha once, then each member fills only the details that apply to them.
- Keeping definitions system-local avoids exposing unfinished privacy expectations to friends and partners.

**Implementation:**
- Added `custom_fields` and `member_field_values` with Drizzle schema and migration.
- Added `/api/custom-fields` and `/api/custom-fields/[id]` for definition management.
- Member create/edit APIs now persist custom field values, and member profile pages display filled fields.
- Export JSON moved to `version: 5` and includes custom field definitions plus member values.

---

## [2026-05-10] D033 - Partners Are Relationship Layer, Not Friend Roles

**Decision:** Treat Partners as a consensual relationship layer on top of friendship, focused on partners such as girlfriend, wife, datemate, spouse, or committed partner system.

**Justification:**
- Partners should add emotional/relationship context without replacing the friend graph.
- Requiring an active friendship first keeps consent and blocking behavior simple.
- Partner views must respect the same member-sharing limits as friends, so relationship status does not bypass privacy.

**Implementation:**
- Partner requests require an active friendship and no block between accounts.
- Partner lists now project shared members and current front through `system_friend_member_shares`.
- Unfriend and block cleanup removes partnerships and pending partner requests.
- Partner UI copy now describes relationship partners instead of generic close-friend status.

---

## [2026-05-10] D034 - Personal Appearance Uses Local Layered Customization

**Decision:** Keep shared theme presets as the stable base while adding local personalization controls for accent color, wallpaper, dim, blur, and reduced texture.

**Justification:**
- Presets remain low-friction for users who want a safe default.
- Wallpaper and accent controls let a system make the app feel personal without forcing account-wide schema changes or creating remote image storage risk.
- Local-only personalization avoids leaking preferences through export/social data.

**Implementation:**
- Extended `lib/theme.ts` with `SOLARA_APPEARANCE_STORAGE_KEY` and document-level appearance application.
- Settings Appearance now supports accent color, wallpaper URL, local wallpaper upload, dim, blur, reduced texture, and reset.
- `DashboardClientProviders` applies the stored appearance on app load.

---

## [2026-05-12] D035 - API Boundaries Parse JSON as Unknown First

**Decision:** Route handlers should parse request JSON through shared helpers and treat the payload as `unknown`/record data until each field is narrowed.

**Justification:**
- The app already has strict TypeScript enabled, but route boundaries were the biggest remaining `any` surface.
- Parsing as a record makes API validation consistent and avoids silently persisting malformed arrays or object values.
- Centralizing invalid JSON responses keeps client behavior predictable while preserving the existing `{ success, data/error }` response family.

**Implementation:**
- Added `parseJsonBody`, `parseJsonRecord`, and `isRecord` in `lib/api/helpers.ts`.
- Converted register, members, notes, front, and partner subresource routes away from `let body: any`.
- Member tag payloads now require string arrays, and stored tag JSON falls back to `[]` if corrupted.

---

## [2026-05-12] D036 - Integration Token Encryption Uses Versioned Key Derivation

**Decision:** New encrypted integration tokens use a `v2` AES-GCM payload with an HKDF-derived key from `INTEGRATIONS_TOKEN_SECRET`. Production no longer silently falls back to `NEXTAUTH_SECRET` for new encryption.

**Justification:**
- Reusing the Auth.js JWT secret for stored integration-token encryption weakens key separation.
- Versioned payloads let Solara improve encryption without breaking already stored data immediately.
- Legacy decrypt support gives operators a controlled migration path instead of silently losing saved PluralKit tokens.

**Implementation:**
- `encryptIntegrationToken()` now writes `v2` payloads.
- `decryptIntegrationToken()` can read `v2` and legacy `v1` payloads.
- Production requires `INTEGRATIONS_TOKEN_SECRET`; legacy `v1` payloads encrypted with a different prior secret can be read via `INTEGRATIONS_LEGACY_TOKEN_SECRET`.
- Added unit coverage for secret requirements, roundtrip encryption, random IVs, tamper rejection, and legacy decrypt.

---

## [2026-05-15] D037 - Android App Lives In An Isolated Expo Workspace

**Decision:** Add the Android app as an isolated Expo/React Native project in `mobile-app` instead of replacing or merging it into the existing Next.js web app.

**Justification:**
- The current site remains the canonical Vercel/Turso/Auth.js web application.
- Expo needs its own package graph, native configuration, EAS profiles, assets, and OTA update setup.
- Keeping mobile code in a subfolder makes it safe to later split the APK app into a dedicated public GitHub repository with `git subtree split`.
- React Native screens should consume backend/API contracts through `mobile-app/src/services` and must not import Drizzle, Auth.js server code, or web-only components.

**Implementation:**
- Created `mobile-app` with Expo SDK 55, TypeScript, Expo Router tabs, `expo-updates`, `expo-dev-client`, and Android package `app.solara.plural`.
- Configured EAS channels: `development`, `preview`, and `production`.
- Reused Solara visual tokens and web app icon assets.
- Added mobile docs for audit, backend/auth TODOs, EAS Update, APK generation, and future repository separation.

---

## [2026-05-25] D038 — Image Upload Uses Server Proxy (uguu.se) Instead Of Direct Client Upload

**Decision:** Files are uploaded through a server-side proxy (`POST /api/upload`) that forwards to uguu.se instead of uploading directly from the browser.

**Evaluated Options:**
| Option | Pros | Cons |
|--------|------|------|
| catbox.moe | Simple API, anonymous, no API key | ❌ Blocks Vercel IP range (HTTP 412) |
| uguu.se | Works from Vercel, no API key, simple JSON response | Files deleted after unknown retention |
| Direct browser → catbox/uguu | No server cost | ❌ CORS blocked — neither service returns `Access-Control-Allow-Origin` |
| Vercel Blob Storage | Integrated, reliable | ❌ Requires paid plan |

**Justification:**
- catbox.moe returns 412 Precondition Failed from Vercel's cloud IP range (tested locally: works from residential IP, blocked from Vercel's `iad1` region)
- uguu.se confirmed working from Vercel (HTTP 200 with file URL)
- Server proxy avoids CORS issues and enforces the 20 MB limit
- The proxy can switch upload backends without client changes

**Implementation:**
- `app/api/upload/route.ts` receives multipart `file`, reads as ArrayBuffer, constructs a new multipart request via `Buffer.concat()` (not native FormData, which has undici serialization bugs), and forwards to `uguu.se/upload`
- Returns `{ url }` on success
- Manual multipart construction uses random boundary, proper Content-Disposition headers, and explicit filename

---

## [2026-05-25] D039 — File Input Uses `<label>` Wrapping Instead Of Programmatic `.click()`

**Decision:** The file upload trigger uses an HTML `<label>` element wrapping `<input type="file">` instead of `<button onClick={() => ref.click()}>`.

**Justification:**
- iOS Safari ignores programmatic `.click()` on file inputs that have `display: none` or `visibility: hidden`
- The `<label>` wrapping pattern is the HTML spec's native mechanism for associating click targets with file inputs and works in every browser without JavaScript dependency
- Also works with `className="hidden"` (no need for opacity/position hacks)

**Implementation:**
```tsx
<label className="flex items-center ios-press cursor-pointer">
  <input type="file" className="hidden" onChange={handleFile} />
  <ImageUp size={18} />
</label>
```

---

## [2026-05-25] D040 — PluralKit Export Uses Name-Based Dedup Before Create

**Decision:** Before the export plan emits a `create` operation for an unlinked local member, it first fetches all PK members and checks for a case-insensitive name match. If found, the operation becomes `update` with `reason: 'linked_by_name'` and the link is stored automatically.

**Justification:**
- The user had members on PK that were not linked in the Solara DB (e.g., "Evellyn Venerato")
- Without dedup, every export would attempt to create a duplicate on PK, which would 405 (or worse, create real duplicates)
- Storing the link after successful PUT ensures future exports treat it as linked

**Implementation:**
- Fetch PK member list before planning (`GET /systems/@me/members`)
- Build `Map<lowercased_name, uuid>` from PK members
- In `planExportToPluralKit`, check `pkMemberNameMap.get(member.name.trim().toLowerCase())` before the create branch
- After successful PUT in `applyExportToPluralKit`, insert a row in `memberExternalLinks` if `reason === 'linked_by_name'`

---

## [2026-05-25] D041 — Export Uses PUT + Sends Complete Payload Instead Of PATCH + Diff

**Decision:** Member update operations use HTTP PUT with all non-null fields instead of PATCH with a computed diff.

**Justification:**
- PK's OPTIONS response reports `allow: GET,HEAD` but the application server accepts POST/PUT/PATCH (verified with curl) — the user intermittently hit 405 on PATCH
- The diff logic was buggy: it compared snake_case PK fields (`display_name`, `avatar_url`) against camelCase DB member fields, producing empty patches
- Sending all non-null fields is simpler and correct for one-way sync — no need to reconstruct PK state

**Implementation:**
- Changed `method: 'PATCH'` to `method: 'PUT'` in `applyExportToPluralKit`
- Removed the broken candidate-loop diff in `planExportToPluralKit` — now builds a complete patch object with all non-null fields
- Both 404 (member deleted) and 405 (write rejected) are caught and skipped with member context in diagnostics
---

## [2026-06-05] D042 - Android APK Notifications Use Native FCM, Not Browser Web Push

**Decision:** The installed Android APK registers a native Capacitor Push Notifications token (`android-fcm`) and Solara sends those tokens through Firebase Admin/FCM. Browser PWA installs continue using the existing Web Push/VAPID path.

**Justification:**
- The shipped APK runs in a native Capacitor WebView and should not depend on the user's default browser or Samsung Internet web-push behavior.
- FCM notification payloads are displayed by Android even when the app is backgrounded or killed, which is the required behavior for the APK.
- Reusing `notification_push_tokens.platform` avoids a risky schema migration while keeping token types explicit.
- The in-app notification center remains the durable source of history; push is a delivery channel only.

**Implementation:**
- Added `/api/notifications/native-tokens` to upsert encrypted native FCM tokens for the authenticated system.
- Added `firebase-admin` FCM delivery alongside existing `web-push` delivery.
- Updated the notification self-test to report per-device `android-fcm` results.
- Updated Capacitor runtime/settings flows to register native push before attempting the self-test.
- Production requires `FIREBASE_SERVICE_ACCOUNT_JSON` or the supported split Firebase env vars in Vercel.

---

## [2026-06-16] D043 - Cross-runtime Agent Engineering Harness

**Decision:** Add `docs/AGENT_HARNESS.md` as the shared operating brain for Claude Code, OpenCode, Codex, and model-variant agents, with native Claude skills and OpenCode commands for harness planning, idea fit, and production gates.

**Justification:**
- The project is maintained through multiple agent runtimes and many model families, including free/open-source models.
- Fast or experimental models are useful for exploration and first-pass work, but they need explicit context, production-safety gates, and review/QA escalation rules.
- Solara's product intent is sensitive: agents must preserve privacy, warmth, plural-system safety, roadmap coherence, and existing architectural decisions.
- A shared harness reduces drift between `AGENTS.md`, `CLAUDE.md`, `.claude/agents`, `.opencode/agents`, and model-specific workflows.

**Implementation:**
- Added `docs/AGENT_HARNESS.md` with source-of-truth order, model routing, quality gates, idea-fit rubric, validation matrix, and memory/documentation protocol.
- Added Claude Code skills: `/agent-harness`, `/idea-fit`, and `/production-gate`.
- Added OpenCode commands with the same names.
- Configured `opencode.json` to include the harness as an instruction file.
- Updated project agent instructions and core agent prompts to load the harness for non-trivial work.

---

## [2026-06-16] D044 — Hermes Agent Enrichment: Memory, Self-Improvement, SOUL.md & Subagents

**Decision:** Enrich the agent harness with four capabilities inspired by Hermes Agent
(Nous Research, MIT, 194K+ GitHub stars, v0.15+): layered memory architecture,
GEPA-inspired reflection loop, SOUL.md personality system, and subagent coordination
patterns.

**Justification:**
- Hermes Agent's 4-layer memory model (working context → MEMORY.md/USER.md →
  project artifacts → skills) maps directly to Solara's need for persistent agent
  knowledge across sessions.
- The GEPA self-improvement mechanism (ICLR 2026 Oral, 35× fewer rollouts than GRPO)
  inspired a lightweight reflection protocol that makes every task contribute to
  process optimization without requiring automated prompt evolution.
- The SOUL.md personality system gives every agent a consistent identity, tone, and
  values — critical for Solara's warm, human, private product DNA.
- Hermes's isolated subagent system inspired parallel coordination patterns that
  reduce context pollution when multiple agents work in parallel.

**Implementation:**
- Refactored `docs/AGENT_HARNESS.md` section 9 into a 4-layer memory architecture
  with MEMORY.md, USER.md, bounded curation, and skill auto-creation.
- Added section 11: Self-Improvement & Reflection Loop — structured post-task
  reflections that compound into process improvements.
- Added section 12: Agent Personality & Voice (SOUL.md) — defines identity, tone,
  values, boundaries, and role-specific voice adaptations.
- Added section 13: Subagent & Parallel Work Patterns — isolation rules and
  coordination flow for parallel agent work.
- Added section 14: Hermes Agent Runtime (Optional) — when and how to use Hermes
  Agent alongside this harness.
- Created `docs/SOUL.md` with full personality definition.
- Created Claude Code skills: `/reflect`, `/soul`.
- Created OpenCode commands: `/reflect`, `/soul`.
- Updated `docs/DECISIONS.md` with integration notes for Hermes Agent memory format
  and SOUL.md compatibility.

---

## [2026-07-28] D045 — Minimal Redesign Uses Existing Product Contracts

**Decision:** Adopt the Claude Design minimal visual direction as a shared,
mobile-first presentation layer while keeping the existing routes, APIs, database
model, themes, localization, and accessibility contracts authoritative.

**Justification:**
- The light beacon and "Pass the light" language give the front workflow a warmer,
  clearer identity without requiring a data migration.
- Copying the prototype's hard-coded data or standalone HTML would bypass current
  front history, tiers, notes, integrations, optimistic recovery, and permissions.
- Several prototype concepts do not yet have reliable backend semantics, including
  inferred catch-up summaries, note authorship, frequent-member ranking, discreet
  mode, and biometrics.
- Android remains the primary interaction target, so safe areas, touch targets,
  reduced motion, high contrast, and solid low-cost surfaces take precedence over
  decorative blur.

**Implementation:**
- Restyled semantic theme tokens and shared card, sheet, and mobile navigation
  components instead of distributing prototype colors throughout feature code.
- Rebuilt Home around real current-front data with 0/1/2/N member states, tiers,
  elapsed time, notes, and the existing front mutation workflow.
- Updated member discovery and profile entry points while preserving search,
  pagination, creation, editing, and front actions.
- Kept unsupported prototype concepts out of the production UI until their data
  and privacy contracts are defined.

---

## [2026-07-28] D046 - Android/PWA Navigation and Front Editing Favor Immediate Local Interaction

**Decision:** Keep authenticated data authoritative on the server, but make
navigation locale-aware from the first tap and collect front-member and role edits
locally before committing them in one request.

**Justification:**
- Links without the active locale caused a middleware redirect and a second React
  Server Components request on every affected navigation.
- Hydrating SWR directly from browser storage made the initial client tree disagree
  with server HTML, forcing React to discard and rebuild large screens.
- Saving each member or role tap separately made a four-role edit require repeated
  network round trips and screen switching.
- Authenticated API responses are private, fast-changing state and must not be
  served from the service worker's URL-only cache.

**Implementation:**
- Added localized Link/router wrappers and made the five primary mobile destinations
  directly accessible from the Android bottom navigation.
- Kept private SWR data in the session's in-memory cache, avoiding both hydration
  mismatch and a post-hydration application remount, and standardized the members
  cache key across the dashboard.
- Rebuilt the front editor as a searchable local draft with all selected roles
  editable in one bottom sheet and one atomic save.
- Made authenticated API requests network-only in the service worker while retaining
  static asset caching, a public offline shell, and update handling. Next.js Flight
  and prefetch payloads are explicitly excluded from caching.
- Disabled decorative document view transitions in installed PWA/TWA runtimes and
  added a lightweight dashboard loading boundary.
- Serialized each system's front writes inside one database transaction and added an
  expected-front precondition with a fixed-size snapshot digest so concurrent devices
  cannot silently overwrite drafts or leak notes through oversized request headers.

---

## [2026-07-30] D047 — Restore the Direct Interface Without Reverting Reliability Work

**Decision:** Supersede the visual and navigation direction from D045 and the
five-destination navigation detail from D046. Restore the established compact
dashboard, warm glass styling, and four direct mobile destinations: Home, Members,
Front, and More.

**Justification:**
- The light-beacon vocabulary and the split between "Who we are", "Pass the light",
  and "The day" made familiar tasks less self-explanatory and required extra screens.
- Members and Front are frequent Android actions and need stable, literal labels in
  the primary dock.
- The internal work delivered after the redesign solves independent reliability and
  performance problems and must remain intact.

**Implementation:**
- Restored the pre-redesign Home, member list/profile presentation, floating dock,
  glass cards, sheets, radii, shadows, and ambient backgrounds.
- Kept locale-aware links, prefetching, safe areas, haptics, 44px controls, focus
  management, loading/error/empty states, and large-list rendering containment.
- Kept the atomic Front draft editor, tiers and notes, SWR behavior, network-only
  authenticated service-worker policy, transactional writes, and stale-edit
  conflict protection.

---

## [2026-07-30] D048 — Publish Front Server Truth Before Accepting Another Action

**Decision:** Treat the successful `POST /api/front` response as the immediate
authoritative client snapshot, and do not complete a Front interaction until that
snapshot has been published to the shared SWR cache. Front drafts keep the id and
signature captured when the editor opens.

**Justification:**
- Closing an action and starting a second one before a background GET completed
  allowed the second mutation to reuse stale member ids.
- A draft that combined old member selections with a newly revalidated signature
  could overwrite a more recent Front state while appearing conflict-safe.
- A direct member action should require one tap and give visible success, failure,
  or conflict feedback without requiring navigation to refresh the screen.

**Implementation:**
- Member rows now add or remove someone from Front in one touch, optimistically
  paint the result, await the server snapshot, and roll back on failure.
- The full editor selects multiple members, roles, and the note in one compact
  draft and saves them atomically.
- Start/edit controls remain disabled until the initial Front snapshot exists;
  duplicate submissions are blocked before React can rerender the button.
- Android route entrance animation and large backdrop blur are disabled while
  touch feedback and sheet transitions remain.
