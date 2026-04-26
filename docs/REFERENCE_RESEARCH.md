# REFERENCE_RESEARCH.md - Solara Plural

> External research log. Keep this file updated when using outside projects as product or architecture references.

Last updated: 2026-04-25

---

## Purpose

Solara Plural is inspired by Simply Plural, but it must remain its own product: small, warm, private-first, web-first, and deployable on Vercel.

This document records what we learned from Sheaf and nearby projects so future agents do not need to rediscover the same context.

---

## Primary Reference: Sheaf

Source: https://github.com/sheaf-project/sheaf

Sheaf describes itself as open-source plural system tracking and a self-hostable replacement for SimplyPlural. Its README says the project is currently self-hostable and usable, with a hosted service still being set up.

### What Sheaf Does Well

- Treats plural system data as sensitive data from the beginning.
- Builds import/export into the core product instead of treating it as an afterthought.
- Separates API, services, auth, storage, and UI concerns clearly.
- Supports groups/subsystems, tags, custom fields, front tracking, cofronters, custom fronts, avatars, 2FA, API keys, admin tools, registration modes, account deletion, and storage backends.
- Documents self-hosting, client API behavior, auth flows, scopes, file handling, limits, and error responses.
- Is honest about its trust model: it is not end-to-end encrypted; operators must be trusted.

### Sheaf Stack

- Backend: Python 3.12+, FastAPI, SQLAlchemy async, PostgreSQL 16, Redis, Alembic.
- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui.
- Deployment: Docker Compose plus reverse proxy.
- Security: JWT access/refresh tokens, API keys with scopes, TOTP, recovery codes, encrypted email/TOTP fields, storage abstraction.
- License: AGPL-3.0-or-later.

### What To Borrow Conceptually

- Transparent privacy model.
- Versioned API mindset, even if Solara starts with Next route handlers.
- Granular import preview before destructive import.
- Export always available.
- Custom fields as a future schema feature.
- Groups/subsystems as first-class organization.
- Friend/trust model with per-field or per-member visibility.
- Account deletion and data portability before public growth.
- Admin/danger-zone confirmations for irreversible actions.

### What Not To Copy

- Do not migrate Solara to FastAPI/Postgres/Redis unless the product grows beyond the Vercel/Turso scope.
- Do not adopt AGPL obligations accidentally by copying Sheaf code. Use Sheaf as a reference, not a source to paste from.
- Do not promise end-to-end encryption unless the architecture is rebuilt for it.
- Do not add a public hosted/community service layer before privacy, moderation, export, deletion, and abuse controls are designed.

---

## Comparable Projects And Signals

### PluralKit

Sources:
- https://pluralkit.me/
- https://github.com/PluralKit/PluralKit
- https://pluralkit.me/guide/

PluralKit is a Discord bot for plural communities. It supports system information, member profiles, proxying through webhooks, switch/front tracking, imports, exports, and self-hosting. Its switch tracking preserves ordered cofronting and supports moving switches backward in time.

Product signal for Solara:
- Front history must be editable after the fact.
- Import/export compatibility matters.
- Ordered fronters can matter to users.
- PluralKit integration should remain a future path.

### PluralSpace

Source: https://pluralspace.app/

PluralSpace presents itself as an early-alpha cozy web app for plural systems with member profiles, front tracking, stats, journal, chat, polls, roles/permissions, friends/sharing, dark mode, and a respectful non-pathologizing stance.

Product signal for Solara:
- Friend sharing and permissions are highly visible differentiators.
- Dark mode and calm sensory design are not polish; they are core.
- Roles like Owner, Partner, Trusted Friend, and Friend are useful vocabulary for future sharing.

### Plural Star

Source: https://github.com/TheHanyou/Plural-Star

Plural Star is an offline-first mobile app focused on front tracking, system journal, history, chat, polls, custom fields, import/export, multilingual support, and local privacy.

Product signal for Solara:
- Offline-first is valued, even if Solara starts server-backed.
- Users want front tiers such as primary front, co-front, and co-conscious.
- Searchable member picker, tag filtering, retroactive history entries, custom fields, and granular export are high-value features.
- Adjustable text size and multilingual support are worth planning early.

### SElves

Source: https://github.com/moumoum0/SElves

SElves is an Android/Kotlin project for plural system communication and collaboration. Its README emphasizes local storage, chat, tasks, polls, online/status tracking, member management, settings, themes, multilingual direction, and backup import.

Product signal for Solara:
- Internal communication features can expand beyond notes: chat, tasks, polls, status, and shared context.
- Local backup/import is a trust feature.

### imPlural

Sources:
- https://www.reddit.com/r/plural/comments/1s7kgyj/implural_system_tracker_for_plurals_and_friends/
- https://plural.im/

imPlural is a web/PWA-oriented project proposal focused on friends and sharing. The community thread highlights accessibility, sensory load, language support, direct front commands, custom fields, friend notifications, privacy lists, hidden members, custom states, crisis/help buttons, chat, polls, backups, deletion, and sensitive-action confirmations.

Product signal for Solara:
- The current Solara MVP should keep the friend-sharing path visible in the roadmap, but not ship it before privacy foundations.
- Front-change notifications for trusted people are an important future need.
- Editing front times is a must-have for users dealing with memory gaps.

---

## Solara Product Direction After Research

Recommended positioning:

Solara Plural should be the small, warm, Vercel-hosted web home for one or a few trusted systems. It should prioritize clarity, portability, privacy, and a low-stress UI over becoming a large public platform immediately.

### MVP Focus

1. Solid private accounts and system isolation.
2. Members with flexible profile fields.
3. Current front and front history.
4. Editable front entries, including retroactive changes.
5. Notes/journal as a gentle internal memory aid.
6. JSON import/export that is always easy to reach.
7. Deploy-ready Vercel documentation and environment checks.

### Next Product Layer

1. Groups/subsystems.
2. Tags and filtered member picker.
3. Custom fields.
4. Front tiers: primary, co-front, co-conscious.
5. Privacy labels even before friend sharing ships.
6. PWA manifest and mobile install polish.
7. Accessibility settings: text size, reduced motion, theme contrast.

### Later Social Layer

1. Friend invite codes.
2. Roles and visibility lists.
3. Selective member/field/front sharing.
4. Trusted front-change notifications.
5. Account deletion and data retention controls.
6. Abuse and moderation model before any public service.

---

## Trust And Privacy Requirements

Solara must state its trust model honestly.

Current intended architecture:

- Server-backed web app on Vercel.
- Database on Turso/libSQL.
- Auth through Auth.js credentials.
- Operators with access to database/secrets may technically access application data.
- This is not end-to-end encrypted.

Therefore:

- Do not claim E2EE.
- Do not collect analytics until there is a privacy note and URL/query hygiene.
- Do not put sensitive identity details into URLs, query params, logs, or telemetry.
- Mark production secrets as sensitive environment variables in Vercel where available.
- Keep export available before adding complex features.
- Treat deletion, import, and destructive cleanup scripts as high-risk actions with documentation and confirmations.

---

## Architecture Notes For Solara

Keep current stack:

- Next.js App Router on Vercel.
- Turso/libSQL plus Drizzle.
- Auth.js/NextAuth.
- Tailwind with existing `docs/PROJECT_STYLE_GUIDE.md` tokens.

Borrow Sheaf's architectural habits, not its stack:

- Document every route and data shape.
- Keep business logic testable outside UI components where possible.
- Add import preview before writing imported data.
- Use scoped data access everywhere. `systemId` must come from the authenticated session, never from request bodies.
- Prefer small route handlers and shared helpers for auth, validation, and JSON errors.

---

## Open Questions

- Should Solara eventually support self-hosting outside Vercel, or stay Vercel-first?
- Should member terminology be configurable in settings?
- Should friend sharing use role presets or custom privacy lists first?
- Should front tiers be added before custom fields, or after the MVP is stable?
- What level of offline/PWA support is realistic for v0.2?

---

## Source Links

- Sheaf README: https://github.com/sheaf-project/sheaf
- Sheaf client guide: https://github.com/sheaf-project/sheaf/blob/main/docs/CLIENT_PROJECT_STYLE_GUIDE.md
- Sheaf self-hosting guide: https://github.com/sheaf-project/sheaf/blob/main/docs/SELFHOSTING.md
- Sheaf FAQ: https://github.com/sheaf-project/sheaf/blob/main/FAQ.md
- PluralKit: https://pluralkit.me/
- PluralKit GitHub: https://github.com/PluralKit/PluralKit
- PluralKit guide: https://pluralkit.me/guide/
- PluralSpace: https://pluralspace.app/
- Plural Star: https://github.com/TheHanyou/Plural-Star
- Plural Star Desktop: https://github.com/TheHanyou/Plural-Star-Desktop
- SElves: https://github.com/moumoum0/SElves
- imPlural discussion: https://www.reddit.com/r/plural/comments/1s7kgyj/implural_system_tracker_for_plurals_and_friends/

