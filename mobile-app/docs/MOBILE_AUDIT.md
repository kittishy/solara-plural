# Mobile App Audit

## Current Web Project

- Framework: Next.js 14 App Router.
- Language: TypeScript with strict mode.
- Styling: Tailwind CSS v3 with custom Solara tokens.
- Backend: Vercel route handlers, Auth.js/NextAuth v5, Turso/libSQL, Drizzle ORM.
- Data fetching: server components, client fetches, and SWR helpers.
- PWA: `public/manifest.json`, web push service worker, browser Push API.
- Package manager: npm with `package-lock.json`.

## Important Web Folders

- `app/(auth)`: login, register, password reset.
- `app/(dashboard)`: dashboard, members, front, notes, journal, friends, partners, notifications, settings.
- `app/api`: route handlers for account, members, front, notes, export/import, notifications, integrations, partners, friends.
- `components`: web-only React and DOM components.
- `lib`: server data access, auth, helpers, integrations, notifications, theme, i18n.
- `drizzle`: database migrations.
- `public`: manifest, service worker, and icons reused by the mobile app.
- `docs`: product, architecture, deployment, and decision context.

## Environment Variables Observed

From `.env.example` and local key names only:

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN`
- `NEXTAUTH_SECRET`
- `INTEGRATIONS_TOKEN_SECRET`
- `NEXTAUTH_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`

No secret values were copied into the mobile app.

## Reused In Mobile

- Product identity and app name: Solara Plural.
- Dark warm visual tokens from `docs/PROJECT_STYLE_GUIDE.md`.
- Main information architecture: Home, Members, Front, Notes, Settings.
- Data concepts from `docs/DATA_MODEL.md`: systems, members, front entries, notes.
- Production API base default: `https://solara-plural.vercel.app`.
- PWA icon assets from `public/icons`.

## Adapted For React Native

- HTML, CSS, Tailwind classes, and DOM events became React Native components and `StyleSheet`.
- Sidebar/mobile web navigation became native bottom tabs through Expo Router.
- Server components and Drizzle calls were replaced by a client service boundary in `src/services`.
- Browser Push/PWA behavior is not reused directly; native notification work should be added later with Expo-compatible modules.

## Not Automatically Migrated

- Authenticated writes to `/api/front`, `/api/members`, `/api/notes`, and settings routes.
- Auth.js cookie session handling for native Android.
- Web-only service worker push registration.
- Web import/export file picker UX.

These require a mobile-safe auth/session design before production writes should be enabled.
