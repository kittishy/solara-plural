import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encryptPushSubscription,
  decryptPushSubscription,
} from '@/lib/notifications/push-subscription-crypto';

const SUBSCRIPTION_JSON = JSON.stringify({ endpoint: 'https://push.example/abc', keys: { p256dh: 'x', auth: 'y' } });

function clearSecrets() {
  vi.stubEnv('PUSH_SUBSCRIPTION_SECRET', '');
  vi.stubEnv('INTEGRATIONS_TOKEN_SECRET', '');
  vi.stubEnv('NEXTAUTH_SECRET', '');
}

describe('push-subscription-crypto', () => {
  beforeEach(() => {
    clearSecrets();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('round-trips with a configured secret', () => {
    vi.stubEnv('PUSH_SUBSCRIPTION_SECRET', 'a-strong-secret-for-tests');
    const stored = encryptPushSubscription(SUBSCRIPTION_JSON);
    expect(stored.startsWith('enc.')).toBe(true);
    expect(decryptPushSubscription(stored)).toBe(SUBSCRIPTION_JSON);
  });

  it('fails closed in production when no secret is configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => encryptPushSubscription(SUBSCRIPTION_JSON)).toThrow(/no encryption secret/);
  });

  it('falls back to marked plaintext outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const stored = encryptPushSubscription(SUBSCRIPTION_JSON);
    expect(stored.startsWith('plain.')).toBe(true);
    expect(decryptPushSubscription(stored)).toBe(SUBSCRIPTION_JSON);
  });

  it('still decrypts legacy plaintext rows even when a secret exists', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const legacy = encryptPushSubscription(SUBSCRIPTION_JSON);
    vi.stubEnv('PUSH_SUBSCRIPTION_SECRET', 'now-configured');
    expect(decryptPushSubscription(legacy)).toBe(SUBSCRIPTION_JSON);
  });
});
