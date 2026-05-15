# Mobile Backend TODO

## Mobile Auth Adapter

The current web backend is Auth.js cookie-session based. That is good for the Next.js site, but it is not a clean production contract for a native Android app.

Recommended conservative path:

1. Add a dedicated mobile auth API to the web backend.
2. Return a short-lived access token plus refresh strategy scoped to the Solara API.
3. Store mobile tokens with Expo SecureStore.
4. Add authenticated service methods in `src/services` for front, members, notes, and settings.
5. Keep all Turso, Auth.js, PluralKit, VAPID, and integration secrets on the server only.

Adding Expo SecureStore is a native-module change and will require a new APK/AAB before OTA updates can use it.

## API Contracts To Add Or Stabilize

- `POST /api/mobile/session`
- `POST /api/mobile/session/refresh`
- `DELETE /api/mobile/session`
- token-authenticated variants or shared guards for:
  - `GET /api/export`
  - `GET/POST/DELETE /api/front`
  - `GET/POST /api/members`
  - `GET/POST /api/notes`
  - notification list and read state

## Current Mobile Behavior

The Android app reads the configured API base URL and attempts `GET /api/export`. If it cannot read a compatible authenticated response, it keeps bundled preview data so the app opens and remains testable without secrets.
