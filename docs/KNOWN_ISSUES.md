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

**Status:** Open
**Priority:** Low
**Area:** Frontend | PWA | Deploy

**Description:**
`public/manifest.json` exists, but it currently references `/favicon.ico` for all icon purposes.

**Expected Behavior:**
Production PWA install should use real PNG icons, at least 192x192 and 512x512, plus a dedicated maskable icon.

### [ISSUE-009] npm audit reports Next.js 14 production vulnerabilities

**Status:** Open
**Priority:** High
**Area:** Security | Dependencies | Deploy

**Description:**
`npm audit --omit=dev` reports vulnerabilities in `next@14.2.35` and nested `postcss`. The automatic audit fix would install Next 16, which is a breaking framework upgrade.

**Expected Behavior:**
Plan and test a framework upgrade separately, or choose a patched compatible version if one becomes available.

---

## Resolved Issues

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
