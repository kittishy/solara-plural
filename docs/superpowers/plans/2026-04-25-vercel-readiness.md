# Vercel Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove first-deploy blockers and make the Solara Plural Vercel path safer and clearer.

**Architecture:** Keep the existing Next.js 14 App Router + Turso/libSQL architecture. This plan only changes deployment/tooling safety surfaces and docs, without changing core product behavior.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, npm, Node built-in test runner, Vercel.

---

### Task 1: PWA Manifest

**Files:**
- Create: `public/manifest.json`
- Modify: `docs/KNOWN_ISSUES.md`
- Modify: `docs/CHANGELOG.md`

- [x] **Step 1: Add manifest file**

Create `public/manifest.json` with Solara-specific name, short name, colors from `docs/DESIGN.md`, and `/favicon.ico` icon references.

- [x] **Step 2: Verify manifest reference**

Run: `Test-Path public/manifest.json`

Expected: `True`

### Task 2: Non-interactive Lint

**Files:**
- Create: `.eslintrc.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/KNOWN_ISSUES.md`
- Modify: `docs/CHANGELOG.md`

- [x] **Step 1: Add ESLint config**

Create `.eslintrc.json` extending `next/core-web-vitals`.

- [x] **Step 2: Install lint dependencies**

Run: `npm install --save-dev eslint@^8 eslint-config-next@14.2.35`

- [x] **Step 3: Verify lint**

Run: `npm run lint`

Expected: no interactive setup prompt.

### Task 3: Remote Image Policy

**Files:**
- Modify: `next.config.mjs`
- Modify: `docs/KNOWN_ISSUES.md`
- Modify: `docs/CHANGELOG.md`

- [x] **Step 1: Remove broad image allowlist**

Remove `images.remotePatterns` with `hostname: '**'`. The app currently does not use `next/image`, so this policy should not exist before trusted storage domains are chosen.

- [x] **Step 2: Verify build**

Run: `npm run build`

Expected: build succeeds.

### Task 4: Cleanup Script Safety

**Files:**
- Modify: `scripts/cleanup-dupes.cjs`
- Create: `scripts/cleanup-dupes.test.cjs`
- Modify: `package.json`
- Modify: `docs/VERCEL_DEPLOYMENT.md`
- Modify: `docs/KNOWN_ISSUES.md`
- Modify: `docs/CHANGELOG.md`

- [x] **Step 1: Write tests first**

Create tests for duplicate detection and `--apply` parsing using Node's built-in test runner.

- [x] **Step 2: Verify red**

Run: `node --test scripts/cleanup-dupes.test.cjs`

Expected before implementation: failure because exports do not exist.

- [x] **Step 3: Implement dry-run default**

Update `scripts/cleanup-dupes.cjs` so it only deletes when `--apply` is provided. Default mode prints what would be deleted. Export pure helpers for tests.

- [x] **Step 4: Verify green**

Run: `node --test scripts/cleanup-dupes.test.cjs`

Expected: tests pass.

### Task 5: Final Verification

**Files:**
- All changed files

- [x] **Step 1: Run tests**

Run: `npm test`

- [x] **Step 2: Run lint**

Run: `npm run lint`

- [x] **Step 3: Run build**

Run: `npm run build`

- [x] **Step 4: Review git diff**

Run: `git diff -- README.md next.config.mjs package.json package-lock.json .eslintrc.json public/manifest.json scripts/cleanup-dupes.cjs scripts/cleanup-dupes.test.cjs docs`
