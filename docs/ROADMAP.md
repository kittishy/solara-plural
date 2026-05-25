# ROADMAP.md — Solara Plural

> Project roadmap. Updated as milestones are reached.

---

## MVP (v0.1) — Foundation

### Phase -1: Reference, Trust, and Deploy Context
- [x] Research Sheaf as primary external reference
- [x] Research comparable plural-system tools and community signals
- [x] Add reference research documentation
- [x] Add Vercel deployment documentation
- [x] Decide first post-research implementation slice
- [x] Create implementation plan before large behavior changes

### Phase 0: Project Setup
- [x] Architecture decision (Turso + Drizzle + NextAuth)
- [x] Design system (PROJECT_STYLE_GUIDE.md)
- [x] Documentation setup
- [ ] Initialize Next.js 14 project
- [ ] Configure Tailwind CSS with design tokens
- [ ] Configure Drizzle + Turso connection
- [ ] Set up NextAuth.js v5

### Phase 1: Core Data Layer
- [ ] Define Drizzle schema (systems, members, frontEntries, systemNotes)
- [ ] Run initial migrations on Turso
- [ ] Seed script for development
- [ ] Type exports from schema

### Phase 2: Authentication
- [ ] Login page (warm, on-brand)
- [ ] NextAuth Credentials provider
- [x] Server layout protecting dashboard routes
- [x] Self-service password reset with hashed one-time tokens
- [ ] Session display in sidebar
- [ ] Logout functionality

### Phase 3: Members
- [ ] Members list page
- [ ] Member card component
- [ ] Create member form
- [ ] Member profile page
- [ ] Edit member
- [ ] Delete member (with confirmation)
- [ ] Member avatar (color + initials)

### Phase 4: Front Tracking
- [x] Current front display (dashboard)
- [x] Start/end front entry
- [x] Multiple members in front simultaneously
- [x] Front history page
- [x] Front history entry component

- [x] Edit front history entries after the fact
- [x] Add retroactive front entries
- [x] Searchable member picker for front selection
- [x] Preserve ordered fronters where relevant

### Phase 5: Notes
- [ ] Notes list page
- [ ] Create note
- [ ] Edit note (inline editor)
- [ ] Delete note
- [ ] Link note to specific member (optional)

### Phase 6: Import/Export
- [x] Export system data as JSON
- [x] Import members from JSON
- [x] Import/export UI in Settings page
- [x] Inline import/export loading and error states
- [x] Preview-first PluralKit member sync with duplicate-safe identity links

### Phase 7: Settings
- [ ] System name/description edit
- [x] Profile section
- [x] Import/export section
- [ ] (Future) theme toggle

### Phase 8: Polish & Deploy
- [ ] Responsive mobile layout
- [ ] Loading states (skeletons)
- [ ] Empty states (warm, friendly)
- [ ] Error states (kind messages)
- [x] PWA manifest, production PNG icons, and basic service worker
- [x] Non-interactive lint/CI setup
- [x] Restrict remote image hosts for production
- [ ] Vercel deployment
- [ ] Environment variable setup docs

---

## v0.2 — Enrichment

- [ ] Tags/groups for members
- [ ] Groups/subsystems with nesting plan
- [ ] Member search and filter
- [ ] Note search
- [ ] Front tracker: add note to entry
- [ ] Front tiers: primary, co-front, co-conscious
- [ ] Member color picker (full palette)
- [ ] Member avatar image upload
- [x] Custom fields for member profiles
- [ ] Accessibility settings: text size, reduced motion, contrast notes
- [ ] Basic statistics (total front time per member)
- [x] PWA manifest + service worker

---

## v0.3 — Social (Friend Systems)

- [x] System-to-system invite/connection
- [ ] Role presets for sharing: owner, partner, trusted friend, friend
- [x] Selective visibility (which members to share)
- [x] Per-member sharing controls
- [x] View connected system's shared front
- [x] Trusted front-change notifications
- [x] In-app notification center as durable fallback for push
- [x] Partner system member list (read-only, privacy-scoped)
- [x] General friend privacy controls with member exceptions
- [ ] Account deletion and data retention controls before public growth

---

## v1.0 — Stable

- [ ] Email/magic link auth option
- [ ] Light mode support
- [ ] Full accessibility audit
- [ ] Performance audit
- [ ] Data retention/deletion settings
- [ ] Account deletion

---

## Future Ideas

See IDEAS.md for the full backlog of feature ideas.

---

## Android App Track

- [x] Create isolated Expo/React Native workspace in `mobile-app`
- [x] Configure Android package, icons, splash, TypeScript, Expo Router, EAS Build, and EAS Update
- [x] Recreate primary mobile surfaces: Home, Members, Front, Notes, Settings
- [x] Keep API/backend access behind `src/services`
- [ ] Add mobile-safe auth/session API on the web backend
- [ ] Persist native tokens with Expo SecureStore after the auth adapter exists
- [ ] Replace bundled preview writes with authenticated API writes
- [ ] Add Android push notification strategy after the native auth boundary is stable

---


---

## 2026-04-27 Progress Update

### Social (Friend Systems)
- [x] System-to-system invite and connection flow
- [x] Singlet account registration option
- [x] Singlet-to-system self-upgrade in Settings
- [x] Friends dashboard page (incoming/outgoing/connected lists)
- [x] Navigation integration for Friends (desktop and mobile)

### Remaining social work
- [ ] Sharing roles and visibility scopes
- [ ] Expand per-field privacy labels to partner-facing read-only views (sharing config is implemented)
- [ ] Partner system read-only visibility controls
- [ ] Trusted notifications and consent tuning

---

## 2026-04-27 Social Hardening Update

### Completed in social phase
- [x] Unfriend flow
- [x] Optional directional block/unblock flow
- [x] Per-member sharing visibility controls (`hidden`, `profile`, `full`)
- [x] Field-level sharing toggles in Friends sharing settings (`fieldVisibility`)
- [x] Social export portability includes blocks and member-sharing settings

### Next social steps
- [ ] Role presets mapped to sharing defaults
- [ ] Apply field-level visibility when rendering partner read-only social surfaces
- [ ] Read-only partner view honoring per-member visibility

---

## 2026-05-01 Integration Update

### Completed integration foundation
- [x] PluralKit member pull sync with required User-Agent
- [x] PluralKit tokens are stored only as encrypted credentials
- [x] `member_external_links` prevents repeated sync from creating duplicates
- [x] Ambiguous local/remote duplicate names are skipped for user review
- [x] PluralKit front sync respects switch object shape, ordered fronters, and provider rate-limit responses

### Next integration steps
- [ ] Add optional manual conflict resolution for skipped ambiguous members
- [ ] Decide whether front sync should be read-only preview, local import, or bidirectional sync
- [ ] Add provider-specific docs for users to find tokens safely

---

## 2026-05-18 Ruby Migration Track

> **Note:** Ruby code lives in `experiments/ruby-api/` — kept out of root so Vercel
> build never detects the Gemfile. Main production deploy stays pure Next.js.
> Ruby activates via a dedicated Vercel preview project when ready.

### Phase R1: Infrastructure (complete)
- [x] Create `experiments/ruby-api/Gemfile` with Ruby dependencies (bcrypt, dotenv dev)
- [x] Create Ruby database layer (`lib/turso.rb`) using Turso HTTP Pipeline API
- [x] Create Ruby auth helper (`lib/auth.rb`) delegating to NextAuth session endpoint
- [x] Create Ruby response helpers (`lib/response.rb`) matching `lib/api/helpers.ts` shape
- [x] Create Ruby ERB template system (`lib/template.rb`) with XSS-safe `h` helper
- [x] Create ID generator (`lib/id.rb`) and request parser (`lib/request.rb`)
- [x] Create base HTML layout with Solara CSS custom properties (`views/layouts/application.html.erb`)
- [x] Health check endpoint (`endpoints/health.rb`)

### Phase R2: First Ruby Endpoints (complete)
- [x] `GET/POST endpoints/members.rb` — member list + create
- [x] `GET/PUT/DELETE endpoints/members/[id].rb` — per-member CRUD (soft-delete)
- [x] `GET/POST endpoints/notes.rb` — notes list + create
- [x] `GET/PUT/DELETE endpoints/notes/[id].rb` — per-note CRUD
- [x] `GET endpoints/front.rb` — front status (read-only; writes stay in Next.js)
- [x] `GET endpoints/journal.rb` — journal entries
- [x] `pages/members.rb` — server-rendered members page (auth → DB → HTML)
- [x] `pages/notes.rb` — server-rendered notes page (auth → DB → HTML)

### Phase R2.5: Safe Reorganization (complete)
- [x] Move all Ruby code from `api/ruby/` → `experiments/ruby-api/`
- [x] Remove root `vercel.json` and root `Gemfile` (restore clean Next.js Vercel config)
- [x] Fix `require_relative` paths after restructure
- [x] Write `experiments/ruby-api/README.md`
- [x] Update `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`

### Phase R3: Expand Ruby APIs (next)
- [ ] Migrate `POST/DELETE front` (requires PluralKit sync port)
- [ ] Migrate journal write CRUD
- [ ] Migrate custom fields CRUD
- [ ] Migrate notifications list endpoint
- [ ] Set up dedicated Vercel preview project pointing at `experiments/ruby-api/`
- [ ] Add direct JWT verification in Ruby (remove NextAuth session delegation latency)

### Phase R4: Ruby SSR Pages (next)
- [ ] Server-rendered journal page
- [ ] Server-rendered front history page
- [ ] Server-rendered notifications page
- [ ] Server-rendered dashboard page
- [ ] Update frontend routing to serve Ruby HTML for read-only views
- [ ] Add progressive enhancement for forms (HTML `<form>` + Ruby handler)

### Phase R5: Reduce Next.js (future)
- [ ] Move auth to Ruby (bcrypt + session cookies, remove NextAuth dependency)
- [ ] Replace SWR with server-rendered data + HTML forms
- [ ] Convert remaining static pages to Ruby SSR
- [ ] Remove React from read-only pages
- [ ] Reduce Tailwind build to CSS custom properties only
- [ ] Evaluate removing Next.js entirely once all pages are Ruby SSR + vanilla JS

### Phase R6: Frontend Simplification (ongoing)
- [x] Delete `JournalClient.tsx` — SWR with `revalidateOnMount: false` was dead code
- [x] Pre-fetch notifications server-side; pass as `initialData` to eliminate loading flash
- [ ] Remove unnecessary `'use client'` directives
- [ ] Convert display-only client components to server components
- [ ] Replace SWR revalidation with server-side rendering where possible
- [ ] Remove unused npm dependencies
- [ ] Reduce TypeScript complexity in favor of plain data structures
- [ ] Minimize client-side JavaScript payload

---

## 2026-05-25 Chat Feature

### Completed
- [x] Chat page (`/chat`) — real-time messaging with SWR 5s polling, auto-scroll, member identity per message
- [x] Channel management — create/delete channels; messages scoped per channel
- [x] Emoji picker — floating panel, 8 categories, ~300 emojis, inserts at cursor
- [x] Image/file upload via uguu.se server proxy (`POST /api/upload`)
- [x] ReactMarkdown rendering of message content (inline images styled)
- [x] Time-based message grouping and day-separator headers
- [x] iOS Liquid Glass aesthetic (`.ios-glass`, `.ios-blur`) matching the design system
- [x] `system_chat_channels` and `system_chat_messages` tables in Drizzle schema
- [x] API routes: `GET/POST /api/chat`, `DELETE /api/chat/[id]`, `GET/POST /api/chat/channels`, `DELETE /api/chat/channels/[id]`

### Next (chat backlog)
- [ ] Real-time WebSocket push (replace 5s polling)
- [ ] Message edit (append-only edit history)
- [ ] Read/unread indicators per channel
- [ ] Typing indicators
- [ ] @member mention autocomplete
- [ ] Link previews
- [ ] System messages (member joined/left front)
- [ ] Message search within a channel

---
