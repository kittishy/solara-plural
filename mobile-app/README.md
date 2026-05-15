# Solara Plural Android

Official open source Android app for Solara Plural.

This folder is an isolated Expo/React Native app. It does not replace the existing Next.js web app. The web project remains the canonical backend, API, database, and Vercel deployment. The Android app is prepared to consume that backend through service modules in `src/services`.

## Stack

- Expo SDK 55
- React Native 0.83
- TypeScript strict mode
- Expo Router tabs
- EAS Build
- EAS Update with `expo-updates`
- Android package: `app.solara.plural`

## Install

```powershell
cd F:\Solara\coding\solara-plural\mobile-app
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local` with public values only:

```env
EXPO_PUBLIC_SOLARA_API_BASE_URL=https://solara-plural.vercel.app
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

Never place database tokens, Auth.js secrets, VAPID private keys, account cookies, or integration tokens in Expo public variables.

## Run In Development

```powershell
npm start
npm run android
```

For a real Android development build with native modules:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile development
```

## Android Builds

Generate an internal APK:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Generate a production Play Store bundle:

```powershell
npx eas-cli@latest build --platform android --profile production
```

The `preview` profile uses `android.buildType=apk`. The `production` profile uses `app-bundle` for Play Store release.

## EAS Update

This app uses `runtimeVersion: { policy: "appVersion" }`, so OTA updates apply only to compatible native builds with the same app version.

Publish OTA updates:

```powershell
npx eas-cli@latest update --channel development --platform android --environment development --message "Dev update"
npx eas-cli@latest update --channel preview --platform android --environment preview --message "Preview update"
npx eas-cli@latest update --channel production --platform android --environment production --message "Production hotfix"
```

Test an OTA update:

```powershell
npx eas-cli@latest update:list --channel preview
```

Then install the matching preview APK, open the app, close it, and reopen it. Non-development builds download compatible updates in the background and apply them after restart.

Rollback:

```powershell
npx eas-cli@latest update:rollback
```

Non-interactive rollback to the embedded bundle:

```powershell
npx eas-cli@latest update:roll-back-to-embedded --channel production --platform android --message "Rollback to embedded build" --non-interactive
```

Rollback to a known good update group:

```powershell
npx eas-cli@latest update:republish --group <update-group-id> --destination-channel production --platform android --message "Republish stable update" --non-interactive
```

## What Still Requires A New APK Or AAB

- Adding, removing, or changing native modules
- Android permissions
- App package name
- App icon, adaptive icon, splash, scheme, or native config plugins
- `runtimeVersion` policy or app `version`
- Changes requiring a different native runtime

Screen text, layout, TypeScript logic, service code, and bundled JS assets can usually ship through EAS Update while the native runtime stays compatible.

## Current Backend Status

The app has a typed service layer and can read the Solara export API when a compatible authenticated API path is available. The current Next.js backend uses Auth.js cookie sessions, which are web-first. Until a mobile-safe auth adapter is added, the app falls back to bundled preview data instead of exposing secrets or hardcoding cookies.

See `docs/MOBILE_BACKEND_TODO.md`.

## Quality Commands

```powershell
npm run typecheck
npm run lint
npm run doctor
npm run export:android
npm audit
```

## License

MIT. The main repository did not include a license file at the time this app was created, so this mobile app includes its own permissive open source license. If the main project adopts a different license later, align this folder before publishing.

## Separacao Do Repositorio Do APK

After committing this folder in the main repository, create a standalone GitHub repo while preserving the folder history:

```powershell
cd F:\Solara\coding\solara-plural
git subtree split --prefix=mobile-app -b solara/mobile-app-history
gh repo create kittishy/solara-plural-android --public --description "Official Android app for Solara Plural"
git push git@github.com:kittishy/solara-plural-android.git solara/mobile-app-history:main
```

Then clone the new repo normally:

```powershell
git clone git@github.com:kittishy/solara-plural-android.git
cd solara-plural-android
npm install
```
