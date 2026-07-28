import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { describe, it, expect, afterEach } from 'vitest';

/** Restore env vars after each test so tests are independent. */
const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ['INTEGRATIONS_TOKEN_SECRET', 'INTEGRATIONS_LEGACY_TOKEN_SECRET', 'NEXTAUTH_SECRET', 'NODE_ENV'];

afterEach(() => {
  for (const key of ENV_KEYS) {
    const saved = savedEnv[key];
    if (saved === undefined) delete process.env[key];
    else process.env[key] = saved;
  }
  for (const key of ENV_KEYS) delete savedEnv[key];
});

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      const value = values[key as keyof typeof values];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function encryptLegacyV1(secret: string, token: string): string {
  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

describe('token-crypto', () => {
  it('throws in production when INTEGRATIONS_TOKEN_SECRET is absent', async () => {
    setEnv({ NODE_ENV: 'production', INTEGRATIONS_TOKEN_SECRET: undefined, NEXTAUTH_SECRET: 'fallback' });
    const { encryptIntegrationToken } = await import('../token-crypto');
    expect(() => encryptIntegrationToken('pk-token')).toThrow('INTEGRATIONS_TOKEN_SECRET is required');
  });

  it('produces v2 payloads with unique IVs on each call', async () => {
    setEnv({ NODE_ENV: 'production', INTEGRATIONS_TOKEN_SECRET: 'integration-secret', NEXTAUTH_SECRET: undefined });
    const { encryptIntegrationToken, decryptIntegrationToken } = await import('../token-crypto');

    const first = encryptIntegrationToken('pk-token');
    const second = encryptIntegrationToken('pk-token');

    expect(first).toMatch(/^v2\./);
    expect(second).toMatch(/^v2\./);
    expect(first).not.toBe(second);
    expect(decryptIntegrationToken(first)).toBe('pk-token');
    expect(decryptIntegrationToken(second)).toBe('pk-token');
  });

  it('rejects malformed or tampered v2 payloads', async () => {
    setEnv({ NODE_ENV: 'production', INTEGRATIONS_TOKEN_SECRET: 'integration-secret' });
    const { encryptIntegrationToken, decryptIntegrationToken } = await import('../token-crypto');

    const payload = encryptIntegrationToken('pk-token');
    const [format, iv, tag, data] = payload.split('.');
    const tamperedTag = `${tag[0] === 'A' ? 'B' : 'A'}${tag.slice(1)}`;
    const tampered = [format, iv, tamperedTag, data].join('.');

    expect(() => decryptIntegrationToken('v2.bad')).toThrow('Invalid encrypted integration token format');
    expect(() => decryptIntegrationToken(tampered)).toThrow();
  });

  it('decrypts v1 payloads via a configured legacy secret', async () => {
    const legacyPayload = encryptLegacyV1('legacy-secret', 'old-token');

    setEnv({
      NODE_ENV: 'production',
      INTEGRATIONS_TOKEN_SECRET: 'new-secret',
      INTEGRATIONS_LEGACY_TOKEN_SECRET: 'legacy-secret',
    });
    const { decryptIntegrationToken } = await import('../token-crypto');
    expect(decryptIntegrationToken(legacyPayload)).toBe('old-token');
  });

  it('rejects v1 payloads encrypted with an unknown secret', async () => {
    const unknownPayload = encryptLegacyV1('unknown-secret', 'hidden');

    setEnv({
      NODE_ENV: 'production',
      INTEGRATIONS_TOKEN_SECRET: 'known-secret',
      INTEGRATIONS_LEGACY_TOKEN_SECRET: undefined,
    });
    const { decryptIntegrationToken } = await import('../token-crypto');
    expect(() => decryptIntegrationToken(unknownPayload)).toThrow();
  });

  it('falls back to NEXTAUTH_SECRET in non-production when INTEGRATIONS_TOKEN_SECRET is absent', async () => {
    setEnv({ NODE_ENV: 'development', INTEGRATIONS_TOKEN_SECRET: undefined, NEXTAUTH_SECRET: 'next-secret' });
    const { encryptIntegrationToken, decryptIntegrationToken } = await import('../token-crypto');
    const token = encryptIntegrationToken('dev-token');
    expect(token).toMatch(/^v2\./);
    expect(decryptIntegrationToken(token)).toBe('dev-token');
  });

  it('prefers INTEGRATIONS_TOKEN_SECRET over NEXTAUTH_SECRET when both are set', async () => {
    setEnv({ NODE_ENV: 'development', INTEGRATIONS_TOKEN_SECRET: 'primary', NEXTAUTH_SECRET: 'fallback' });
    const { encryptIntegrationToken, decryptIntegrationToken } = await import('../token-crypto');
    const token = encryptIntegrationToken('test-token');
    expect(decryptIntegrationToken(token)).toBe('test-token');
  });

  it('ignores NEXTAUTH_SECRET in production even if INTEGRATIONS_TOKEN_SECRET is absent', async () => {
    setEnv({ NODE_ENV: 'production', INTEGRATIONS_TOKEN_SECRET: undefined, NEXTAUTH_SECRET: 'fallback' });
    const { encryptIntegrationToken } = await import('../token-crypto');
    expect(() => encryptIntegrationToken('pk-token')).toThrow('INTEGRATIONS_TOKEN_SECRET is required');
  });
});
