# CHANGELOG.md — Solara Plural

> All notable changes to this project will be documented here.
> Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [remove] — 2026-07-12 — Partner feature removed

### Removed
- **Partnerships** (system-to-system "partner" relationships, distinct from friends) —
  deleted the pages (`app/(dashboard)/partners/**`), all API routes
  (`app/api/partners/**`, covering requests, notes, milestones, bucket list, and
  alter↔alter pairings), and `lib/partnerships.ts`. Removed the Partners tab from
  `TabBar`, the partnerships stat card from the home dashboard, the partner-request
  row from notification settings, and the `nav.partners` / `home.statPartnerships` /
  `notifications.partnerRequests` / `notifications.checkInReminders` / `partners.*`
  translation keys (all three locales) from `lib/i18n.ts`. Cleaned up the
  partnership/partner-request cleanup blocks in the unfriend and block routes
  (`app/api/friends/[friendSystemId]/route.ts`, `app/api/friends/blocks/route.ts`).
- **Kept intentionally**: the `system_partner_requests`, `system_partnerships`,
  `partnership_notes`, `alter_partner_pairings`, `partnership_milestones`, and
  `partnership_bucket_items` tables and their Drizzle migrations are untouched — no
  data is dropped, so the feature can come back later without a schema migration.

## [remove] — 2026-07-09 — Chat feature removed (low usage)

### Removed
- **In-system chat** — low usage, not worth the surface area right now. Deleted the
  page (`app/(dashboard)/chat/`), all API routes (`app/api/chat/**`, including the
  SSE stream), `components/chat/EmojiPicker.tsx`, and `lib/chat/realtime-broker.ts`
  (this was a chat-only broker, distinct from `lib/notifications/realtime-broker.ts`
  which is unrelated and untouched). Removed the Chat tab from `TabBar`, the "Chat"
  PWA shortcut from `public/manifest.json`, and the `nav.chat` / `chat.*` translation
  keys (all three locales) from `lib/i18n.ts`.
- **Kept intentionally**: the `system_chat_channels`, `system_chat_messages`, and
  `chat_channel_reads` tables and their Drizzle migrations are untouched — no data
  is dropped, so the feature can come back later without a schema migration.
- Bottom nav is now 3 primary tabs (Home, Members, Front) + More, down from 4.

## [design] — 2026-07-09 — Premium Solara identity (goodbye "iOS Settings" look)

### Changed
- **Brand identity at the token layer** — the app no longer reads as a stock iOS
  Settings clone. The default accent moved from iOS blue `#007AFF` to the Solara
  violet from `docs/PROJECT_STYLE_GUIDE.md` (`#7C3AED` light / `#8B5CF6` dark), and
  dark mode moved from flat pure-black/grey to the deep warm purple-black palette
  the style guide always described (`app/globals.css`). Custom themes are untouched:
  they override the same variables and still win.
- **Brand typography** — Nunito (400–800) is now loaded via `next/font` and used
  everywhere, replacing the system SF Pro stack; large titles/headers stepped up to
  weight 800 (`app/layout.tsx`, `tailwind.config.ts`).
- **Buttons are pills with an accent glow**; inputs gained a hairline border and a
  violet focus ring (`components/ui/button.tsx`, `components/ui/input.tsx`).
- **Tab bar** — fully rounded floating dock; the active tab gets a tinted violet pill
  instead of blue text. Fixed a bug where no tab ever highlighted on localized routes
  (`/en/...`, `/pt-BR/...`): the active check now strips the language prefix
  (`components/layout/TabBar.tsx`). "More" sheet items got per-destination colored
  icon chips.
- **Settings** — every row has a colored icon chip (iOS-style tints, one per area)
  and the profile header shows a violet→pink gradient avatar
  (`app/(dashboard)/settings/page.tsx`, `GroupedRow` gained a `tint` prop).
- **Home** — "Now fronting" is the hero card at the top (per DESIGN.md), with a live
  pulsing indicator, start-time/duration inline and a soft violet→pink wash; stat
  tiles switched to a horizontal icon-chip layout (`app/(dashboard)/HomeContent.tsx`).
- **Login** — gradient brand tile logo with glow (`app/(auth)/login/page.tsx`).
- **Front tier "Primary"** recolored `#007AFF` → `#8B5CF6` to match the identity
  (`lib/front.ts`, front + history pages).
- **PWA/browser chrome** — manifest and `themeColor` updated to the new canvases
  (`#f5f2ef` light / `#0e0b16` dark).

## [fix] — 2026-06-22 — Silent action failures + theme toggle

### Fixed
- **Actions failed silently across the app** — many client mutations fired `fetch()`
  without checking `res.ok` and gave no feedback, so when a write failed (validation,
  500, expired session) the UI just reverted or, worse, kept the wrong state with no
  error shown. This was the main source of the "I tapped it and nothing happened" feel.
  Added a lightweight global toast (`components/providers/ToastProvider.tsx`, mounted in
  the root layout, distinct from the push `NotificationToast`) and wired error feedback
  into: Front toggle/tier/end (`app/(dashboard)/front/page.tsx`), Home front toggle/end
  (`app/(dashboard)/HomeContent.tsx`), friends accept/decline/unblock/sharing
  (`app/(dashboard)/friends/page.tsx`), partner requests + diary/milestones/bucket
  (`app/(dashboard)/partners/**`), and admin announcement toggle/delete
  (`app/(admin)/admin/maintenance/page.tsx`).
- **Home front toggle kept the wrong state on failure** — `HomeContent.toggleMember`
  returned the optimistic state when the POST failed instead of throwing, so SWR's
  `rollbackOnError` never triggered and the bad front list stayed on screen. The failed
  write now throws (rolls back) and revalidates against server truth.
- **Light/Dark/System toggle did nothing while a custom theme was active** — a custom
  palette writes inline vars on `<html>` that override both the light and dark palettes,
  so tapping a mode had no visible effect. Selecting a mode now clears the custom override
  (and resets the editor swatches so the change is visible, not silent), in
  `app/(dashboard)/settings/theme/page.tsx`.

## [feature/fix] — 2026-06-10

### Fixed
- **Production login outage (admin-panel migration missing)** — the `/admin` code merged on 2026-06-06 shipped to Vercel before its database migration was applied: `systems.is_admin/suspended_at/suspended_reason` and the `app_settings`/`admin_announcements`/`admin_audit_log` tables did not exist in the Supabase production DB, so the login query (which selects every schema column) and the dashboard layout's maintenance-mode check crashed. Applied `0001_admin_panel` to production (additive only). **Lesson: Drizzle migrations are NOT applied automatically on deploy — apply to Supabase before/with any schema-touching merge.** The new CI (below) plus this changelog note are the guardrails.
- **Push notifications silently not delivered** — `createNotification` fired push delivery as a floating promise; on Vercel the function freezes right after the response, killing in-flight sends at random. Delivery is now wrapped in `waitUntil` (`@vercel/functions`), web push sends carry `TTL: 24h` + `urgency: high`, and transient push-service failures (429/5xx) get one spaced retry.
- **Theme customization had almost no visible effect** — `applyCustomTheme` wrote `--theme-*` variables that no CSS consumed, and Tailwind's `text-ios-blue`/`bg-ios-blue` were compiled hex. The custom theme engine now derives EVERY consumed token (shadcn semantic tokens, `--ios-*`, glass/tab-bar/separator vars) from the user's 6 colours, and `ios.blue` reads `var(--ios-blue-rgb)` so the accent applies everywhere (with alpha support). Restoring defaults now actually clears overrides (new `clearCustomTheme`), letting the light/dark mode palettes work again.
- **CI never ran** — `.github/workflows/ci.yml` triggered on `main`, but the repository default branch is `master`. Now triggers on `master` pushes and all PRs.
- **a11y lint warnings** — lucide `Image` icon renamed (false-positive alt-text), color picker sliders got `aria-valuenow/min/max`, members page memoizes `allMembers`.

### Added
- **Native Android push (FCM) committed** — Capacitor `@capacitor/push-notifications` client registration (`lib/notifications/native-push.ts`), Firebase Admin sender (`lib/notifications/fcm.ts`), `POST/DELETE /api/notifications/native-tokens` (platform `android-fcm`, tokens encrypted at rest), wired into `createNotification` and the self-test endpoint. Requires `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel.
- **Real-time chat over SSE** — new `/api/chat/stream` (in-process broker + 3s DB poll, same design as the notifications stream) replaces the 5s polling; messages on the open channel paint instantly, a 30s SWR interval remains as fallback.
- **Chat unread badges** — `chat_channel_reads` table + `POST /api/chat/channels/[id]/read`; channel list returns `unreadCount`, sidebar shows per-channel badges and the channels button shows an unread dot.
- **High-contrast mode** — optional toggle in Settings → Theme → Options (`data-solara-high-contrast`): stronger text/borders, near-opaque surfaces, no glass blur or ambient wash. Both light and dark palettes covered.
- **Front statistics** — `FrontStats` card on Front History: total front time per member with 7d/30d/all period filter, computed client-side from history (ongoing fronts count up to now; sessions clamped to the window).
- **Notes search** — title+content text search on the notes page, combined with the category filter.
- **Durable rate limiting** — `rate_limits` Postgres table with atomic upsert replaces the per-instance in-memory limiter on register and password-reset routes (fails open to the memory limiter if the DB is unreachable). Resolves ISSUE-014.

### Security
- `npm audit fix` + `ws` override to `^8.21.0` (memory-disclosure advisory). Remaining production advisories require breaking upgrades (Next 15/16, nodemailer 8, firebase-admin transitive) — tracked in ISSUE-009.

## [fix] — 2026-05-30

### Fixed
- **Chat image uploads no longer expire** — uploads went to `uguu.se`, which deletes files after a few hours, so previously sent images broke. Switched `/api/upload` to **catbox.moe** (also free, but permanent — files never expire). Same multipart flow; optional `CATBOX_USERHASH` env var ties uploads to an account for later management. *(Note: images already lost to uguu.se's expiry can't be recovered; this fixes all uploads going forward.)*
- **Chat send button clipped off-screen** — the input pill (`flex-1`) lacked `min-w-0`, so on narrow screens it refused to shrink and pushed the round send button past the right edge. Added `min-w-0` so the pill shrinks and the send button stays fully on-screen.
- **Headers no longer render under the Android status bar** — the TWA is drawn edge-to-edge but the WebView reports `env(safe-area-inset-top)` as `0`, so every sticky header (Settings sub-pages, Chat, member detail) and large title sat under the clock/battery. Added a `@media (display-mode: standalone/fullscreen/minimal-ui)` floor in `globals.css` that raises `--safe-top` to `max(env(...), 32px)`, and applied `pt-[var(--safe-top)]` to the remaining hand-rolled headers (`chat`, `members/[id]`). No-op on the open web (the media query doesn't match) and respects larger real notch insets on iOS.
- **Installed app (TWA/PWA) now detected for live data** — the shipped Android app is a PWABuilder **TWA**, which never exposes `window.Capacitor`. The old `isNativeAppRuntime()` only checked for Capacitor, so none of the "app-like" tuning (service-worker cache bypass + background polling) ever activated inside the real APK. Result: users saw stale data until they switched tabs and came back. Added `isStandaloneApp()` (display-mode standalone/fullscreen/WCO, iOS `navigator.standalone`, `android-app://` referrer) and `isAppRuntime()` = native ∪ standalone. `apiFetcher`, `SWRProvider`, and `ServiceWorkerRuntime` now key live-data behavior off `isAppRuntime()`, so the TWA and installed PWA refresh in real time without manual tab switching.
- **Settings sub-page headers cut off under the status bar** — every Settings tab (`profile`, `theme`, `notifications`, `privacy`, `custom-fields`, `import`, `integrations`, `delete-account`) hand-rolled its own `sticky top-0` header without safe-area handling, unlike the shared `NavBar`. Added `pt-[var(--safe-top)]` so they no longer collide with the status bar / notch in the standalone app (no-op on the web where the inset is 0).
- **In-app notification toast tucked under the status bar** — `NotificationToast` was pinned at a fixed `top-3`; now offset by `var(--safe-top)` so it clears the notch in the installed app.

> **Note for deployment — TWA push delivery:** Web Push in the TWA requires (1) the APK to be built with PWABuilder **Notification delegation = ON** and (2) the `TWA_PACKAGE_NAME` + `TWA_SHA256_FINGERPRINTS` env vars set so `/.well-known/assetlinks.json` verifies the APK. Without both, Android runs the app as a Custom Tab and silently drops Web Push. The code path is correct; this is operational config. See `docs/GENERATE_APK.md`.

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

## [feature] — 2026-05-25

### Added
- **Chat page** (`/chat`) — real-time messaging with auto-scroll, member identity, time/date separators, channel management (create/delete), SWR 5s polling, and iOS Liquid Glass aesthetic
- **Emoji picker** (`components/chat/EmojiPicker.tsx`) — floating panel above input bar with 8 categorized groups (~300 emojis), iOS-style animations, inserts emoji at cursor position
- **Image upload via uguu.se** (`app/api/upload/route.ts`) — server-side proxy accepts multipart file, forwards to uguu.se, returns URL. Multipart constructed via Buffer.concat() for full Node.js reliability. 20 MB limit.
- **File upload button** in chat input — `<label>` wrapping `<input type="file">` for cross-browser compatibility (no fragile `ref.click()`)
- **ReactMarkdown rendering** — message content rendered via ReactMarkdown with `prose-img:rounded-ios-md` for styled inline images
- **Name-based dedup for PluralKit export** — before creating, checks if PK member with same name exists; uses `update` + auto-stores link in `memberExternalLinks` instead of creating duplicates
- **405 resilience in member export** — 405 errors caught and skipped alongside existing 404 handling, with member name + action appended to error diagnostics

### Changed
- **PK export uses PUT instead of PATCH** — PK API intermittently returned 405 on PATCH; PUT is functionally equivalent for full-member sync
- **Export comparison simplified** — removed broken candidates loop that compared snake_case PK field names against camelCase DB fields; now always sends all non-null fields in PATCH/PUT
- **Name lookup trim fix** — `member.name.toLowerCase()` → `member.name.trim().toLowerCase()` so leading/trailing whitespace doesn't break PK name dedup
- **Hidden file input changed from `<button onClick={ref.click()}>` to `<label>` wrapping** — fixes iOS Safari file picker (display:none blocks programmatic .click())
- **Error handling in upload flow** — `handleFileUpload` now shows `alert()` with server error message instead of silently failing
- **PK member empty-string guard** — `if (member.description)` guards against sending empty descriptions, pronouns, avatarUrl

### Fixed
- **EmojiPicker closing tag removed by accident during edit** — restored EmojiPicker props after refactor

---

## [Unreleased]

### Added
- Cross-runtime Agent Engineering Harness for Claude Code, OpenCode, Codex, and model-variant agents: `docs/AGENT_HARNESS.md`, Claude skills (`/agent-harness`, `/idea-fit`, `/production-gate`), OpenCode commands with the same names, and shared quality/model-routing gates.
- Native Android APK push delivery via Capacitor FCM tokens, Firebase Admin fanout, `/api/notifications/native-tokens`, and per-device self-test diagnostics for `android-fcm`.
- Isolated Expo/React Native Android app in `mobile-app`, with TypeScript, Expo Router tabs, EAS Build profiles, EAS Update setup, Android package `app.solara.plural`, and docs for APK/OTA/repository separation
- Defensive unit coverage for token encryption, password reset helpers, custom fields, friend visibility helpers, front helpers, and in-memory rate limiting
- Password reset flow with `/forgot-password`, `/reset-password`, hashed one-time reset tokens, and optional Resend email delivery
- PWA service worker, production PNG app icons, and installable manifest updates
- Native Web Push setup through the browser Push API and VAPID keys
- Notification persistence tables: `notification_push_tokens`, `notifications`, and `notification_deliveries`
- Notification APIs for token registration, notification listing, marking one read, and marking all read
- `/notifications` dashboard page and navigation entry
- Friend front-change notifications from `POST/DELETE /api/front`, with in-app history as the durable source and browser push as best-effort delivery
- Custom field definitions in Settings and per-member custom field values on member create/edit/profile pages
- Shared system profile pages for connected accounts, showing privacy-scoped front and visible members
- Local appearance controls for accent color, wallpaper URL/upload, dim, blur, and reduced texture
- PluralKit member sync from Settings with preview/apply flow, cautious merge options, and no token persistence
- Settings integrations cleanup: removed Simply Plural token integration from production sync surface
- PluralKit API helper with tested fronters parsing, retry-after formatting, and switch timestamp extraction
- `POST /api/integrations/member-sync` for provider-specific safe member sync
- `member_external_links` table and migration `0006_member_external_links.sql` for stable provider identity mapping
- Tests for the sync planner covering external links, ambiguous duplicates, non-overwrite defaults, and duplicate remote names
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
- Route handlers for register, members, notes, front, and partner subresources now use shared JSON body parsing with `unknown`/record boundaries instead of `any`
- Member tag parsing now fails closed for malformed stored JSON and rejects non-string submitted tags
- Integration token encryption now writes HKDF-derived `v2` payloads, requires `INTEGRATIONS_TOKEN_SECRET` in production, and can read legacy `v1` payloads through an explicit legacy secret
- Password reset confirmation now claims reset tokens atomically before password hashing, reducing the replay window for concurrent submissions
- Middleware now handles only locale redirects/rewrites; dashboard layouts and API routes own auth checks, removing Auth.js/Jose Edge runtime build warnings
- PluralKit apply-mode sync now parses `/fronters` as a switch object, preserves ordered fronters, and uses the remote switch timestamp for local front history
- PluralKit member/front apply now commits local member/link/front changes in one database transaction
- Local front changes no longer create redundant PluralKit switches when the requested front already matches the active front in the same order
- PluralKit `429` update responses now report rate-limit retry guidance without automatic retry loops
- Export JSON bumped to `version: 4` and now includes `integrations.memberExternalLinks`
- Export JSON bumped to `version: 5` and now includes `customFields.definitions` plus `customFields.memberValues`
- Partner requests now require an existing friendship, and partner views respect friend member-sharing privacy
- Friends privacy controls now offer general visibility actions with member exceptions for detailed overrides
- `/api/export` now tolerates invalid stored JSON in member tags and front member IDs
- `/api/front` now validates that every submitted member ID belongs to the authenticated system before creating a current front
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
- Added baseline security headers in `next.config.mjs` (`nosniff`, frame denial, strict referrer policy, opener isolation, permissions policy, and production HSTS)
- Added in-memory rate limiting to password reset request and confirmation endpoints as a local defense-in-depth layer
- Password reset delivery failures for existing accounts now return the same generic success shape to avoid account enumeration through SMTP failures
- Password reset requests now return generic success responses, store only token hashes, expire tokens, and invalidate prior unused reset links
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
