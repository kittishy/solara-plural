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
| Framework | Next.js 14 (App Router) | SSR + RSC + Route Handlers |
| Language | TypeScript | Strict mode enabled |
| Database | Turso (libSQL) | SQLite-compatible, serverless-ready |
| ORM | Drizzle ORM | `@libsql/client` adapter |
| Auth | NextAuth.js v5 (Auth.js) | Credentials provider, JWT sessions |
| Styling | Tailwind CSS v3 | Custom design tokens |
| State | React Context + SWR | Auth context + data fetching |
| Deployment | Vercel | Native Next.js support |
| Package Manager | npm | Current lockfile is package-lock.json |

---

## Folder Structure

```
solara-plural/
├── app/                          # Next.js App Router
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
├── middleware.ts                  # Auth protection middleware
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
Browser → Next.js Page (RSC or Client) → SWR hook → API Route Handler
→ Auth check (NextAuth session) → Drizzle query → Turso (libSQL)
→ Response → UI update
```

---

## Authentication Flow

```
1. User → /login page
2. Submits email + password
3. NextAuth Credentials provider → bcrypt verify
4. JWT created with { systemId, email, name }
5. middleware.ts protects all /(dashboard) routes
6. API routes verify session via getServerSession()
7. All DB queries scoped to session.systemId
```

### Auth Runtime Split

Auth.js has two configuration layers:

- `lib/auth/edge-config.ts` contains middleware-safe session, page, and callback settings.
- `lib/auth/config.ts` adds the Credentials provider, database lookup, and bcrypt password verification for Node/server route usage.

Middleware imports only the edge-safe config. This keeps Node-only credential dependencies out of the Edge runtime and keeps navigation protection fast.

Protected pages redirect unauthenticated users to `/login`. Protected API routes return `401` JSON so client-side fetch handlers can show inline errors instead of trying to parse redirected HTML.

---

## Environment Variables

```env
# .env.local
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
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
