# ARCHITECTURE.md — Solara Plural

> System architecture for the Solara Plural web application.
> Read before making structural decisions.

---

## Overview

Solara Plural is a Next.js 14 web application with App Router, backed by Turso (libSQL)
via Drizzle ORM, deployed on Vercel. It is a warm, accessible digital space for plural
systems to organize their internal world.

---

## Stack Summary

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router) | Canonical production stack; Ruby lives in experiments/ |
| Languages | TypeScript (production), Ruby (experiment) | Ruby SSR/API layer staged in `experiments/ruby-api/` |
| Database | Turso (libSQL) | SQLite-compatible, serverless-ready |
| ORM | Drizzle ORM (Node.js), raw SQL (Ruby) | Ruby uses Turso HTTP Pipeline API directly |
| Auth | NextAuth.js v5 (Auth.js) | Credentials provider, JWT sessions; Ruby delegates to NextAuth |
| Styling | Tailwind CSS v3 + inline CSS (Ruby SSR) | Shared CSS custom properties for visual consistency |
| State | SWR (client pages only) | Minimal client-side state; server-rendered pages need no state |
| Deployment | Vercel | `@vercel/next` only in production; `@vercel/ruby` planned for a dedicated preview project |
| Package Manager | npm | `Gemfile` lives in `experiments/ruby-api/`, not at root |

---

## Folder Structure

```
solara-plural/
├── experiments/
│   └── ruby-api/                 # Ruby SSR experiment (NOT in Vercel production build)
│       ├── lib/                  # Shared Ruby helpers (turso, auth, response, template, id, request)
│       ├── views/                # ERB templates for server-rendered pages
│       ├── pages/                # SSR page handlers (return HTML)
│       ├── endpoints/            # JSON API handlers (members, notes, front, journal, health)
│       │   ├── members/
│       │   └── notes/
│       └── Gemfile               # Ruby dependencies (bcrypt, dotenv dev only)
├── app/                          # Next.js App Router (legacy, being reduced)
│   ├── (auth)/                   # Auth route group (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Main app route group
│   │   ├── layout.tsx            # Sidebar + nav layout
│   │   ├── page.tsx              # Dashboard / home
│   │   ├── members/
│   │   │   ├── page.tsx          # Members list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Member profile
│   │   │   └── new/
│   │   │       └── page.tsx      # Create member
│   │   ├── front/
│   │   │   ├── page.tsx          # Current front tracker
│   │   │   └── history/
│   │   │       └── page.tsx      # Front history
│   │   ├── notes/
│   │   │   ├── page.tsx          # Notes list
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Note detail/edit
│   │   └── settings/
│   │       └── page.tsx          # System settings + import/export
│   ├── api/                      # Route Handlers
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── members/
│   │   │   ├── route.ts          # GET all, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET one, PUT update, DELETE
│   │   ├── front/
│   │   │   ├── route.ts          # GET current, POST start front
│   │   │   └── history/
│   │   │       └── route.ts      # GET front history
│   │   ├── notes/
│   │   │   ├── route.ts          # GET all, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET, PUT, DELETE
│   │   └── export/
│   │       └── route.ts          # GET full system export
│   │   └── import/
│   │       └── route.ts          # POST import JSON
│   ├── layout.tsx                # Root layout (fonts, providers)
│   └── globals.css               # Tailwind base + custom vars
├── components/                   # Reusable UI components
│   ├── ui/                       # Base primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Modal.tsx
│   │   └── Spinner.tsx
│   ├── members/
│   │   ├── MemberCard.tsx
│   │   ├── MemberChip.tsx
│   │   └── MemberForm.tsx
│   ├── front/
│   │   ├── FrontIndicator.tsx
│   │   └── FrontHistoryEntry.tsx
│   ├── notes/
│   │   ├── NoteCard.tsx
│   │   └── NoteEditor.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── MobileNav.tsx
│   └── providers/
│       ├── AuthProvider.tsx
│       └── ThemeProvider.tsx
├── lib/                          # Shared utilities and logic
│   ├── db/
│   │   ├── index.ts              # Drizzle client + Turso connection
│   │   └── schema.ts             # Drizzle schema (all tables)
│   ├── auth/
│   │   └── config.ts             # NextAuth config
│   ├── api/
│   │   └── helpers.ts            # Auth guard, response helpers
│   └── utils/
│       ├── dates.ts
│       ├── colors.ts             # Member color utilities
│       └── json.ts               # Import/export helpers
├── types/                        # Shared TypeScript types
│   ├── db.ts                     # Inferred Drizzle types
│   └── api.ts                    # API request/response types
├── hooks/                        # Custom React hooks
│   ├── useMembers.ts
│   ├── useFront.ts
│   └── useNotes.ts
├── public/                       # Static assets
│   ├── icons/
│   └── images/
├── docs/                         # Project documentation
│   ├── MASTER_CONTEXT.md
│   ├── DECISIONS.md
│   ├── ARCHITECTURE.md
│   ├── PROJECT_STYLE_GUIDE.md
│   ├── ROADMAP.md
│   ├── CHANGELOG.md
│   ├── DATA_MODEL.md
│   ├── IDEAS.md
│   ├── KNOWN_ISSUES.md
│   └── UX_NOTES.md
├── middleware.ts                  # Locale negotiation + route rewrite middleware
├── next.config.ts                 # Next.js config
├── tailwind.config.ts             # Tailwind + design tokens
├── drizzle.config.ts              # Drizzle migration config
├── tsconfig.json
├── .env.local                     # Environment variables (gitignored)
├── .env.example                   # Example env vars (committed)
└── package.json
```

---

## Data Flow

```
Production (Next.js):
Browser → Vercel → Next.js Page (RSC or Client) → SWR hook / direct DB
→ Auth check (NextAuth session) → Drizzle query → Turso (libSQL)
→ Response → UI update

Experiment (Ruby, preview only):
Browser → Ruby handler (standalone Rack/Vercel preview project)
→ Auth check (delegates to NextAuth session endpoint)
→ Turso HTTP Pipeline API → JSON or HTML response
```

---

## Authentication Flow

```
1. User → /login page
2. Submits email + password
3. NextAuth Credentials provider → bcrypt verify
4. JWT created with { systemId, email, name }
5. Dashboard layout verifies the session before rendering protected app routes
6. API routes verify session via getServerSession()
7. All DB queries scoped to session.systemId
```

### Auth Runtime Split

Auth.js has two configuration layers:

- `lib/auth/edge-config.ts` contains shared session, page, and callback settings.
- `lib/auth/config.ts` adds the Credentials provider, database lookup, and bcrypt password verification for Node/server route usage.

Middleware does not import Auth.js. It only handles locale negotiation and rewrites localized URLs back to internal app routes. This keeps JWT/Jose and credential dependencies out of the Edge middleware bundle, while protected dashboard layouts and API route handlers own session checks.

Protected pages redirect unauthenticated users to `/login`. Protected API routes return `401` JSON so client-side fetch handlers can show inline errors instead of trying to parse redirected HTML.

### Social Visibility Flow

Friend and partner surfaces use the same privacy source of truth:

1. `system_friendships` confirms the accounts are connected.
2. `system_blocks` prevents contact or profile access in either direction.
3. `system_friend_member_shares` decides which members and fields are visible to that specific connected account.
4. System profile and partner views project current front/member lists through those sharing rows before rendering.

Partners are not a sharing role. They are a relationship layer on top of an active friendship, so unfriend and block actions also remove partnerships and pending partner requests.

### Custom Fields Flow

System-defined profile fields live in `custom_fields`, and member answers live in `member_field_values`.

- Settings manages field definitions through `/api/custom-fields`.
- Member create/edit pages submit `customFieldValues` with the normal member payload.
- Member profile pages display only filled values.
- Export `version: 5` includes both definitions and values.

Custom field values are currently local to the owning system and are not exposed to friends or partners.

### Local Appearance Flow

Theme presets remain the shared baseline. Personal appearance details are applied locally through `lib/theme.ts` and browser storage:

- accent color,
- wallpaper URL or compressed local upload,
- wallpaper dim and blur,
- reduced texture.

`DashboardClientProviders` applies the stored appearance when the dashboard mounts.

### Password Reset Flow

```
1. User opens /forgot-password from the login page
2. POST /api/password-reset/request receives the email and always returns a generic success response
3. If the account exists, Solara creates a random reset token, stores only its SHA-256 hash, and invalidates prior unused reset tokens for that account
4. Local development returns the temporary reset URL in the UI; production sends it by email when Resend env vars are configured
5. User opens /reset-password?token=...
6. POST /api/password-reset/confirm verifies hash, expiry, and unused status, then stores a new bcrypt password hash
7. Successful reset marks all unused reset tokens for that account as used
```

The flow does not reveal whether an email exists, does not store raw reset tokens, and keeps reset routes public while dashboard/API data stays session-protected.

---

## Environment Variables

```env
# .env.local
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=your-resend-api-key
PASSWORD_RESET_FROM_EMAIL="Solara Plural <reset@example.com>"
```

---

## Security Principles

- All API routes verify session before any DB operation
- SystemId is always taken from JWT, never from request body
- Passwords hashed with bcrypt (cost factor 12)
- No user can access another system's data
- Environment secrets never committed to git
- Current architecture is server-backed and not end-to-end encrypted
- Do not place member names, notes, front state, or system details in URLs, query params, analytics, or routine logs
- Before public growth, add account deletion, data retention, and clearer privacy controls

---

## Reference-informed Architecture Notes

Research from Sheaf and related plural-system tools is tracked in `REFERENCE_RESEARCH.md`.

Solara should borrow architecture habits, not external implementation code:

- Keep the Vercel-first stack until the MVP is stable.
- Treat import/export as core infrastructure.
- Add import preview before destructive imports.
- Keep `systemId` session-derived in every route.
- Plan custom fields, groups/subsystems, and privacy labels as first-class data model extensions.
- Avoid copying AGPL source code from Sheaf or PluralKit into this codebase without an explicit license decision.

---

## 2026-05-15 Architecture Update: Android App Workspace

Solara now has an isolated Expo/React Native Android workspace at `mobile-app`.

The Next.js web app remains the canonical backend, database, and Vercel deployment. The mobile app is a native client that must interact with Solara through explicit service boundaries in `mobile-app/src/services`.

Mobile structure:

```
mobile-app/
├── app/                 # Expo Router tabs and root layout
├── src/components/      # React Native UI components
├── src/screens/         # Screen-level composition
├── src/services/        # API/config/http boundaries
├── src/hooks/           # Data and update hooks
├── src/lib/             # Small client utilities
├── src/types/           # Mobile data contracts
├── src/constants/       # Theme and bundled preview data
├── assets/              # Android icons and splash assets
├── docs/                # Mobile audit and backend TODOs
├── app.config.ts        # Expo Android/EAS Update config
└── eas.json             # EAS Build channels and profiles
```

Current backend limitation:

- Authenticated production writes from native Android need a mobile-safe auth adapter. The current Auth.js cookie session model is web-first, so the mobile app falls back to bundled preview data when `/api/export` is unavailable or unauthenticated.


---

## 2026-04-27 Architecture Update: Friends + Account Types

### Auth/session changes
- Credentials login still authenticates against `systems`.
- JWT/session now include `accountType` (`system` or `singlet`) in addition to `systemId`.
- Registration accepts account type and stores it on the account.

### New API surfaces
- `PUT /api/account/type`
  - Self-service account type update (used for `singlet -> system` upgrade).
- `GET /api/friends`
  - Lists connected friends, incoming requests, outgoing requests.
- `POST /api/friends`
  - Sends invite by email and supports auto-accept when opposite pending request already exists.
- `POST /api/friends/requests/[id]`
  - Accept, decline, or cancel friend request.

### New dashboard surface
- `/(dashboard)/friends`
  - Warm, consent-first social UI for invites and friend management.
- Sidebar and mobile navigation now include `Friends`.
- Dashboard prefetch now includes `/friends`.

### Data portability changes
- Export route now includes:
  - `system.accountType`
  - `social.friendRequests`
  - `social.friendships`

### Philanthropic UX intent
- The social flow intentionally supports both plural systems and singlet friends.
- Singlet onboarding remains simpler while preserving easy self-identification upgrades.

## 2026-04-27 Architecture Update: Safety + Sharing Layer

### New social safety routes
- `DELETE /api/friends/[friendSystemId]`:
  - Explicit unfriend operation.
  - Removes sharing rows for the friend pair.
- `POST /api/friends/blocks` and `DELETE /api/friends/blocks/[blockedSystemId]`:
  - Directional blocking.
  - Blocking transaction removes friendship, pending requests, and sharing links for that pair.

### New sharing routes
- `GET /api/friends/sharing/[friendSystemId]`:
  - Returns owner-member visibility matrix for one connected friend.
  - Includes `fieldVisibility` per member for field-level sharing control.
- `PUT /api/friends/sharing/[friendSystemId]`:
  - Updates one member visibility (`hidden`, `profile`, `full`).
  - Accepts optional `fieldVisibility` payload (`pronouns`, `description`, `avatarUrl`, `color`, `role`, `tags`, `notes`).
  - Enforces ownership (`member.systemId === auth.systemId`).

### Friends sharing UI behavior
- `FriendsClient` exposes per-member sharing controls with:
  - Visibility level select (`hidden`, `profile`, `full`)
  - Field-level toggles mapped to `fieldVisibility` for non-hidden members
- UI updates are persisted through `PUT /api/friends/sharing/[friendSystemId]`.

### Runtime invariants
- Invites are rejected when either side is blocked.
- Friend-request acceptance is rejected when either side is blocked.
- Sharing requires active friendship and no block in either direction.

### Validation workflow used
- Applied DB migrations against configured Turso target with `npm run db:migrate`.
- Executed real two-account social flow via `scripts/validate-friends-flow.cjs` against local server.

### Maintenance workflow used
- Added validation-account cleanup script: `scripts/cleanup-validation-data.cjs`.
- `npm run cleanup:validation` runs dry-run lookup for validation accounts (`alpha.*@example.com`, `beta.*@example.com`).
- `npm run cleanup:validation:apply` deletes matched validation accounts.
- Script behavior is covered by `scripts/cleanup-validation-data.test.cjs`.

---

## 2026-05-01 Architecture Update: External Member Sync

### New integration surface
- `POST /api/integrations/member-sync`
  - Supports `provider: "pluralkit"`.
  - Accepts a token per request and can reuse an encrypted persisted token when available.
  - `apply: false` returns a dry-run preview.
  - `apply: true` refetches remote data, replans, and applies the safe plan transactionally.

### Provider behavior
- PluralKit reads `GET /systems/@me` and `GET /systems/@me/members` from `https://api.pluralkit.me/v2`.
- PluralKit requests include an identifying `User-Agent`.
- Apply-mode front pull reads `GET /systems/@me/fronters` as a switch object (`members` + timestamp), preserving ordered fronters locally.
- Outbound front changes use `POST /systems/@me/switches` only when local front actually changes; duplicate same-order front submissions do not create redundant remote switches.
- Rate-limit responses (`429`) are surfaced with retry timing and are not retried automatically.

### Integration credential storage
- Integration credentials are stored in `system_integrations` as encrypted payloads (`encrypted_token`).
- Encryption uses AES-256-GCM in app layer (`lib/integrations/token-crypto.ts`) with `INTEGRATIONS_TOKEN_SECRET` (or `NEXTAUTH_SECRET` fallback).
- Decrypted tokens are used only in server runtime when sending provider requests.
- `system_integrations` is not included in export payloads.

---

## 2026-05-09 Architecture Update: PWA + Notifications

### PWA surface
- `public/manifest.json` declares the installable Solara app metadata and production PNG icons.
- `public/service-worker.js` handles Push API events and caches only safe app assets such as manifest and icons.

### Notification surfaces
- `/notifications` is the durable in-app notification center.
- `POST /api/notifications/tokens` saves the current browser's native Push API subscription for the authenticated system.
- `DELETE /api/notifications/tokens` revokes the current browser token.
- `GET /api/notifications` returns the authenticated system's notification list and unread count.
- `PATCH /api/notifications/[id]` marks one notification read/unread.
- `POST /api/notifications/read-all` marks all current notifications read.

### Delivery behavior
- `POST /api/front` and `DELETE /api/front` persist local front changes first, then enqueue best-effort friend notifications.
- Notification recipients are derived from existing `system_friendships`.
- Member names are included in the in-app notification body only when the recipient already has non-hidden sharing access to those fronting members.
- Web Push payloads are minimal and point users back to `/notifications`; failed push sends do not block front changes.

### Merge invariants
- Identity links live in `member_external_links`.
- PluralKit UUID is preferred as the primary external id; the short id is stored as secondary.
- A single existing local same-name match is linked instead of duplicated.
- Ambiguous local or remote duplicate names are skipped, not guessed.
- Existing non-empty Solara fields are not overwritten unless the user enables per-field overwrite switches.
- Member sync pulls member data into Solara; normal local front changes can push PluralKit switches when a saved token and member links exist.
- Apply-mode member/front pull is applied in a single local transaction so the API does not report rollback after partial local writes.

### Adjacent hardening
- `GET /api/export` now tolerates corrupted JSON in `members.tags` and `front_entries.memberIds` by exporting empty arrays for invalid values.
- `POST /api/front` now verifies every `memberId` belongs to the authenticated system before creating a current front entry.

---

## 2026-05-18 Architecture Update: Ruby Hybrid Migration

### Motivation

Solara is migrating from a React-heavy architecture toward a Ruby-centric server-rendered model:
- **Lower complexity** — Ruby endpoints are simpler than TypeScript route handlers for CRUD operations
- **Less client JS** — server-rendered HTML pages eliminate React hydration for read-only views
- **AI-friendly** — fewer files, less abstraction, lower token consumption for maintenance
- **Artisanal feel** — the project should feel like handcrafted software, not a framework template

### Why `experiments/ruby-api/` and not `api/ruby/`

Vercel's CLI (`vercel build`) automatically detects a `Gemfile` at the project root and tries to resolve Ruby version dependencies before building. This validation fails regardless of the version spec used (`~> 3.3.x`, `3.3.0`, or no version). Moving Ruby to `experiments/` keeps the `Gemfile` out of the root, preventing detection and allowing `vercel build` to succeed with the pure Next.js stack.

The Ruby layer is developed here and will be activated via a dedicated Vercel preview project or a separate Vercel project that only deploys `experiments/ruby-api/` when it is ready for production use.

### Ruby Experiment Layer (`experiments/ruby-api/`)

```
experiments/ruby-api/
├── lib/
│   ├── turso.rb         # Turso HTTP Pipeline API client (no native extensions)
│   ├── auth.rb          # Session verification (delegates to Next.js /api/auth/session)
│   ├── response.rb      # JSON response helpers (same shape as lib/api/helpers.ts)
│   ├── template.rb      # ERB template renderer for SSR pages
│   ├── id.rb            # CUID2-style ID generator (SecureRandom, no gems)
│   └── request.rb       # JSON body parsing and field validation helpers
├── views/
│   ├── layouts/
│   │   └── application.html.erb   # Base HTML layout with Solara theme tokens
│   ├── members/
│   │   └── index.html.erb         # Server-rendered member list (XSS-safe via h.call())
│   └── notes/
│       └── index.html.erb         # Server-rendered notes list
├── pages/
│   ├── members.rb       # SSR members page (auth → DB → HTML)
│   └── notes.rb         # SSR notes page (auth → DB → HTML)
├── endpoints/
│   ├── members.rb       # Members collection API (GET list, POST create)
│   ├── members/
│   │   └── [id].rb      # Per-member API (GET, PUT, soft-DELETE)
│   ├── notes.rb         # Notes collection API (GET list, POST create)
│   ├── notes/
│   │   └── [id].rb      # Per-note API (GET, PUT, DELETE)
│   ├── front.rb         # Front status API (GET only — writes stay in Next.js)
│   ├── journal.rb       # Journal entries API (GET only)
│   └── health.rb        # Health check
├── Gemfile              # Ruby deps: bcrypt, dotenv (dev only); all else is stdlib
└── README.md            # Experiment setup and local dev instructions
```

### Ruby Database Access

Ruby uses the Turso HTTP Pipeline API (`lib/turso.rb`) instead of native libSQL bindings to avoid native extension issues in serverless runtimes. This client:
- Converts `libsql://` URLs to HTTPS automatically
- Uses the `/v2/pipeline` request format: `{ requests: [{ type: 'execute', stmt: { sql, args } }, { type: 'close' }] }`
- Returns rows as Ruby hashes with column names as keys
- Handles type coercion for integers, floats, text, and nulls

### Ruby Authentication

Ruby endpoints verify authentication by forwarding the browser's session cookie to the Next.js `/api/auth/session` endpoint (`lib/auth.rb`). This ensures Ruby and Next.js endpoints respect the same auth state without duplicating JWT verification logic.

### Migration Coverage (experiment)

| Surface | Ruby (experiment) | Next.js (production) |
|---------|-------------------|---------------------|
| Members list | `endpoints/members.rb` (JSON) + `pages/members.rb` (HTML) | `GET /api/members` + `/members` |
| Notes list | `endpoints/notes.rb` (JSON) + `pages/notes.rb` (HTML) | `GET /api/notes` + `/notes` |
| Front status | `endpoints/front.rb` (GET only) | `GET /api/front` + `/front` |
| Journal list | `endpoints/journal.rb` (GET) | `GET /api/journal` + `/journal` |
| Health check | `endpoints/health.rb` | — |
| Front writes | — (R3) | `POST/DELETE /api/front` |
| Notifications | — (R3) | `GET/PATCH /api/notifications` |

### Migration Principles

1. **Production-safe** — Ruby lives in `experiments/`, Vercel builds never touch it
2. **Additive only** — Ruby endpoints are added alongside existing ones, nothing is removed
3. **Same response shape** — Ruby returns `{ success: true, data: ... }` matching `lib/api/helpers.ts`
4. **Same auth model** — Ruby delegates to NextAuth, no separate auth system
5. **Same database** — both runtimes query the same Turso instance
6. **No framework dependency** — plain Rack handlers, no Rails/Sinatra required in production
7. **Progressive adoption** — pages that need interactivity stay in React; read-only views move to Ruby SSR
