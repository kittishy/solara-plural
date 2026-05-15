import Constants from 'expo-constants';

type ExtraConfig = {
  solaraApiBaseUrl?: string;
  eas?: {
    projectId?: string;
  };
};

function readExtra(): ExtraConfig {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') return {};
  return extra as ExtraConfig;
}

export function getSolaraApiBaseUrl(): string | null {
  const value = readExtra().solaraApiBaseUrl;
  if (!value || value.trim().length === 0) return null;
  return value.replace(/\/+$/, '');
}

export function getEasProjectId(): string | null {
  const value = readExtra().eas?.projectId;
  if (!value || value === '00000000-0000-0000-0000-000000000000') return null;
  return value;
}
