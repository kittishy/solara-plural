# VERCEL_DEPLOYMENT.md - Solara Plural

> Deployment notes for the initial Vercel-hosted version.

Last updated: 2026-04-25

---

## Deployment Goal

Solara Plural starts as a Vercel-hosted Next.js app with a Turso/libSQL database. The first production deployment should prove that auth, member management, front tracking, notes, import/export, and responsive layout work reliably for a small private user group.

---

## Required Services

- Vercel project using the Next.js framework preset.
- Turso database reachable from Vercel.
- Git repository connected to Vercel for preview and production deployments.

---

## Required Environment Variables

Set these in Vercel for Production and Preview unless a variable is intentionally environment-specific.

```env
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=https://your-production-domain.example
```

Local development can keep these in `.env.local`. Never commit `.env.local`.

Use sensitive or encrypted environment variable storage for secrets where available:

```powershell
vercel env add DATABASE_URL --sensitive
vercel env add DATABASE_AUTH_TOKEN --sensitive
vercel env add NEXTAUTH_SECRET --sensitive
```

`NEXTAUTH_URL` should match the deployed site URL for production. Preview deployments may need separate Auth.js handling if callback URLs become strict.

---

## Pre-Deploy Checklist

- [ ] `README.md` explains setup, env vars, database migration, and deploy flow.
- [ ] `.env.example` contains every required variable with safe placeholder values.
- [ ] `.gitignore` excludes `.env.local` and other secrets.
- [ ] `npm run build` passes locally.
- [ ] Drizzle migrations have been generated and applied to the Turso database.
- [ ] `npm run lint` passes non-interactively.
- [ ] `npm test` passes.
- [ ] `public/manifest.json` exists if `app/layout.tsx` references `/manifest.json`.
- [ ] Remote image hostnames are restricted before public production use.
- [ ] Import/export actions have visible success and error states.
- [ ] Destructive scripts are documented before use against production.

---

## Vercel Project Settings

Recommended settings:

- Framework preset: Next.js.
- Install command: `npm install`.
- Build command: `npm run build`.
- Output directory: let Vercel detect Next.js defaults.
- Node version: use Vercel default compatible with Next.js 14 unless a future dependency requires otherwise.

---

## Database Deployment Flow

1. Create or select the Turso database.
2. Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` locally.
3. Generate migrations after schema changes:

```powershell
npm run db:generate
```

4. Apply migrations:

```powershell
npm run db:migrate
```

5. Repeat migration against production database before deploying production code that depends on new tables or columns.

---

## Privacy And Logging Rules

Plural system data is sensitive. Treat logs, URLs, analytics, imports, and exports accordingly.

- Do not put member names, notes, front state, or system details in query params.
- Do not log request bodies from auth, import, member, notes, or front routes.
- Do not enable analytics until URL hygiene and a privacy note are in place.
- Do not claim end-to-end encryption with the current architecture.
- Make export easy to reach before onboarding more than the first trusted users.

---

## Dangerous Maintenance Scripts

`npm run cleanup:dupes` runs duplicate-member cleanup in dry-run mode and prints which IDs would be deleted.

`npm run cleanup:dupes:apply` performs deletion against the database configured in `.env.local`.

Before using `cleanup:dupes:apply`:

- Export the system data.
- Confirm `.env.local` points to the intended database.
- Run the dry run first.
- Copy the IDs that will be deleted into the maintenance notes or issue.

---

## Production Verification

After a deployment:

- Register a test system.
- Log in and log out.
- Create a member.
- Edit the member.
- Start and end a front.
- View front history.
- Create and edit a note.
- Export JSON.
- Import a small known-good JSON file into a non-production account.
- Test mobile navigation and keyboard focus.

Record failures in `docs/KNOWN_ISSUES.md` and resolved changes in `docs/CHANGELOG.md`.

---

## Sources

- Vercel environment variable docs and CLI guidance: https://vercel.com/docs/environment-variables
- Vercel CLI env command: https://vercel.com/docs/cli/env
- Vercel deployments overview: https://vercel.com/docs/deployments/overview
- Next.js deployment docs: https://nextjs.org/docs/app/building-your-application/deploying
