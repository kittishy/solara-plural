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
- [x] Design system (DESIGN.md)
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
- [ ] Middleware protecting dashboard routes
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
- [ ] Current front display (dashboard)
- [ ] Start/end front entry
- [ ] Multiple members in front simultaneously
- [x] Front history page
- [x] Front history entry component

- [x] Edit front history entries after the fact
- [x] Add retroactive front entries
- [ ] Preserve ordered fronters where relevant

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
- [x] PWA manifest or remove manifest reference until ready
- [x] Non-interactive lint/CI setup
- [x] Restrict remote image hosts for production
- [ ] Vercel deployment
- [ ] Environment variable setup docs

---

## v0.2 — Enrichment

- [ ] Tags/groups for members
- [ ] Groups/subsystems with nesting plan
- [ ] Member search and filter
- [ ] Searchable member picker for front selection
- [ ] Note search
- [ ] Front tracker: add note to entry
- [ ] Front tiers: primary, co-front, co-conscious
- [ ] Member color picker (full palette)
- [ ] Member avatar image upload
- [ ] Custom fields for member profiles
- [ ] Accessibility settings: text size, reduced motion, contrast notes
- [ ] Basic statistics (total front time per member)
- [ ] PWA manifest + service worker

---

## v0.3 — Social (Friend Systems)

- [ ] System-to-system invite/connection
- [ ] Role presets for sharing: owner, partner, trusted friend, friend
- [ ] Selective visibility (which members to share)
- [ ] Per-member and per-field privacy labels
- [ ] View partner system's public front
- [ ] Trusted front-change notifications
- [ ] Partner system member list (read-only)
- [ ] Privacy controls per member
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
