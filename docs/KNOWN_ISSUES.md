# KNOWN_ISSUES.md - Solara Plural

> Tracking known bugs, limitations, and technical debt.

---

## Template

```
### [ISSUE-XXX] Short title

**Status:** Open | In Progress | Resolved
**Priority:** Critical | High | Medium | Low
**Area:** Frontend | Backend | Database | Auth | UX | Performance

**Description:**
What is the issue?

**Steps to Reproduce:**
1. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Notes / Workaround:**
...

**Resolved in:** [version or commit]
```

---

## Open Issues

- Browser plugin verification is blocked on this workstation because the Node REPL runtime resolves to Node v22.19.0 and the plugin requires >= v22.22.0. Build and HTTP route checks are being used until Node is updated.

### [ISSUE-015] Android app needs a mobile-safe auth adapter before production writes

**Status:** Open
**Priority:** High
**Area:** Mobile | Auth | API

**Description:**
The new Expo Android app is a real React Native client, but the current Solara backend uses Auth.js cookie sessions designed around the Next.js web app. Native Android should not hardcode cookies or expose server secrets in `EXPO_PUBLIC_*` config.

**Expected Behavior:**
Mobile login should use a server-owned token/session contract, and API writes for front, members, notes, and settings should be authenticated without leaking secrets.

**Notes / Workaround:**
`mobile-app/src/services` currently attempts the configured API export endpoint and falls back to bundled preview data if no compatible authenticated response is available. See `mobile-app/docs/MOBILE_BACKEND_TODO.md`.

### [ISSUE-007] Roadmap status may lag behind implementation

**Status:** Resolved
**Priority:** Medium
**Area:** Documentation

**Description:**
Some roadmap items appear implemented in code but remain unchecked. This can mislead future agents and cause duplicate work.

**Expected Behavior:**
Roadmap status should be reconciled after a build/test pass confirms behavior.

**Resolved in:** 2026-04-25 front history editing and retroactive entry pass

### [ISSUE-008] PWA manifest uses favicon instead of production PNG icons

**Status:** Resolved
**Priority:** Low
**Area:** Frontend | PWA | Deploy

**Description:**
`public/manifest.json` exists, but it currently references `/favicon.ico` for all icon purposes.

**Expected Behavior:**
Production PWA install should use real PNG icons, at least 192x192 and 512x512, plus a dedicated maskable icon.

**Resolved in:** 2026-05-09 PWA/Web Push notification foundation. Added PNG icons, maskable icon, and service worker.

### [ISSUE-009] npm audit reports Next.js 14 production vulnerabilities

**Status:** Open
**Priority:** High
**Area:** Security | Dependencies | Deploy

**Description:**
`npm audit --omit=dev` reports vulnerabilities in `next@14.2.35`, nested `postcss`, and `nodemailer` through both the app dependency and Auth.js. The automatic audit fix would install Next 16 and newer Auth/Nodemailer packages, which is a breaking framework/auth upgrade.

**Expected Behavior:**
Plan and test a framework upgrade separately, or choose a patched compatible version if one becomes available.

### [ISSUE-013] Drizzle migration journal and snapshots need reconciliation

**Status:** Open
**Priority:** High
**Area:** Database | Tooling

**Description:**
The migration journal references migrations after `0007`, but matching snapshot files are missing for the later migrations. There is also an orphan `0007_system_integrations.sql` file while `0007_silly_cyclops.sql` already creates `system_integrations`.

**Expected Behavior:**
Drizzle migrations and metadata should be consistent before running `npm run db:generate` again.

**Notes / Workaround:**
Do not regenerate migrations until production migration state is checked. Prefer a forward-only repair plan: validate the Turso migrations table, remove or quarantine orphan SQL only after confirmation, reconstruct snapshots in a clean branch, and test by applying all migrations to a blank database.

### [ISSUE-014] Auth rate limiting is local-only and should move to durable storage

**Status:** Open
**Priority:** Medium
**Area:** Security | Auth

**Description:**
Password reset endpoints now have an in-memory limiter, which helps local/runtime instances but is not a global limit across Vercel serverless instances.

**Expected Behavior:**
Public auth surfaces should use a durable shared limiter, such as Upstash Redis/KV or a database-backed failed-attempt table, before broader public use.

## Resolved Issues

### [ISSUE-010] External provider front sync is not implemented yet

**Status:** Resolved
**Priority:** Medium
**Area:** Backend | Integrations | Data

**Description:**
PluralKit models front as switches with a member list. The original integration slice intentionally synced members only.

**Resolved in:** 2026-05-08 PluralKit sync hardening. Front pull now parses PluralKit switch objects and outbound local front changes create PluralKit switches only when the local front actually changes.

---

### [ISSUE-004] ESLint script is still interactive

**Status:** Resolved
**Priority:** Medium
**Area:** Tooling | CI

**Description:**
`npm run lint` opened the interactive Next.js ESLint setup prompt instead of running a stable lint command.

**Resolved in:** 2026-04-25 Vercel readiness pass. Added `.eslintrc.json`, `eslint`, and `eslint-config-next`; `$env:CI='1'; npm run lint` now runs non-interactively.

### [ISSUE-005] Manifest route is referenced before manifest exists

**Status:** Resolved
**Priority:** Low
**Area:** Frontend | PWA | Deploy

**Description:**
`app/layout.tsx` referenced `/manifest.json`, but no `public/manifest.json` existed.

**Resolved in:** 2026-04-25 Vercel readiness pass. Added an initial Solara manifest.

### [ISSUE-006] Remote image host policy is too broad

**Status:** Resolved
**Priority:** Medium
**Area:** Security | Privacy | Deploy

**Description:**
`next.config.mjs` allowed remote images from any HTTPS hostname.

**Resolved in:** 2026-04-25 Vercel readiness pass. Removed the broad image optimizer allowlist until trusted image/storage domains are chosen.

### [ISSUE-001] Settings import/export buttons appear stuck

**Status:** Resolved
**Priority:** High
**Area:** Frontend | Backend | UX

**Description:**
Settings import could stay disabled after failed file reads, invalid JSON, unexpected HTML responses, or failed API parsing. Export could fail without inline feedback.

**Expected Behavior:**
Buttons show progress, recover after errors, and give clear feedback.

**Actual Behavior:**
Import could leave `importing` true and make the button feel dead.

**Resolved in:** 2026-04-25 settings reliability pass

### [ISSUE-002] Protected API calls redirected to login HTML

**Status:** Resolved
**Priority:** High
**Area:** Auth | API | UX

**Description:**
Unauthenticated API fetches received `302` redirects to `/login`, which client code could not parse as JSON.

**Resolved in:** 2026-04-25 middleware API auth response update

### [ISSUE-003] Middleware imported Node-only credential logic

**Status:** Resolved
**Priority:** Medium
**Area:** Auth | Performance

**Description:**
Middleware imported full Auth.js config, including bcrypt credential verification, producing Edge runtime warnings and a larger middleware bundle.

**Resolved in:** 2026-04-25 edge-safe auth split

---

### [ISSUE-011] Current front accepted unowned member IDs

**Status:** Resolved
**Priority:** High
**Area:** Backend | Data

**Description:**
`POST /api/front` accepted any non-empty string in `memberIds`, while historical front routes validated membership ownership.

**Resolved in:** 2026-05-01 external integration hardening pass

### [ISSUE-012] Export parsed stored JSON without fallback

**Status:** Resolved
**Priority:** Medium
**Area:** Backend | Data Portability

**Description:**
`GET /api/export` used direct `JSON.parse` for member tags and front member IDs. Corrupted stored JSON could break export.

**Resolved in:** 2026-05-01 external integration hardening pass

---
