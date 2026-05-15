import type { ConfigContext, ExpoConfig } from 'expo/config';

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '00000000-0000-0000-0000-000000000000';
const apiBaseUrl = process.env.EXPO_PUBLIC_SOLARA_API_BASE_URL ?? 'https://solara-plural.vercel.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Solara Plural',
  slug: 'solara-plural-android',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'solaraplural',
  userInterfaceStyle: 'dark',
  backgroundColor: '#1a1625',
  primaryColor: '#a78bfa',
  platforms: ['android'],
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    enabled: true,
    url: `https://u.expo.dev/${easProjectId}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1a1625',
  },
  android: {
    package: 'app.solara.plural',
    versionCode: 1,
    allowBackup: false,
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#1a1625',
    },
    permissions: [],
  },
  plugins: ['expo-router', 'expo-updates', 'expo-font'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    solaraApiBaseUrl: apiBaseUrl,
    eas: {
      projectId: easProjectId,
    },
  },
});
