# Solara Plural

Solara Plural is a warm, private-first web app for plural systems to organize members, track fronting, keep notes, and preserve data through import/export.

The project is inspired by Simply Plural and informed by open projects like Sheaf and PluralKit, but it keeps a smaller Vercel-first architecture for the initial version.

---

## Current Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS v3
- Auth.js / NextAuth v5 beta
- Turso/libSQL
- Drizzle ORM
- SWR
- npm

---

## Read First

Project context lives in `docs/`. Start here before changing product, UI, data, auth, or deployment behavior:

- `docs/MASTER_CONTEXT.md`
- `docs/PROJECT_STYLE_GUIDE.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/DECISIONS.md`
- `docs/REFERENCE_RESEARCH.md`
- `docs/VERCEL_DEPLOYMENT.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/CHANGELOG.md`

`docs/PROJECT_STYLE_GUIDE.md` is the design source of truth. Do not replace it with a generic design template.

---

## Local Setup

Install dependencies:

```powershell
npm install
```

Create a local env file:

```powershell
Copy-Item .env.example .env.local
```

Fill in:

```env
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000
```

Run migrations after configuring Turso:

```powershell
npm run db:migrate
```

Start the dev server:

```powershell
npm run dev
```

Open `http://localhost:3000`.

---

## Scripts

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run cleanup:dupes
npm run cleanup:dupes:apply
npm run db:generate
npm run db:migrate
npm run db:studio
```

`cleanup:dupes` is a dry run. `cleanup:dupes:apply` deletes duplicate member rows and should only be used after exporting/backing up data.

---

## Deployment

The intended first deployment target is Vercel.

Before production deploy:

1. Set `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` in Vercel.
2. Mark database tokens and auth secrets as sensitive/encrypted where available.
3. Run `npm run build` locally.
4. Apply Drizzle migrations to the production Turso database.
5. Follow `docs/VERCEL_DEPLOYMENT.md`.

---

## Privacy Position

Solara Plural handles sensitive personal data. With the current architecture, it is server-backed and not end-to-end encrypted. Do not claim E2EE unless the architecture changes.

Core promises to preserve:

- Keep data scoped to the authenticated system.
- Keep import/export easy to access.
- Avoid putting sensitive data in URLs, logs, or analytics.
- Make sharing opt-in and reversible when it is added.

---

## Documentation Rule

Every meaningful product, architecture, data, privacy, deployment, or UX decision must update the relevant file in `docs/` so future sessions do not lose context.

