import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'crypto';

// Push-subscription specific crypto. Decoupled from integration tokens so a
// missing INTEGRATIONS_TOKEN_SECRET in production doesn't break notifications.
//
// Threat model: push subscription endpoints aren't true secrets — they're URLs
// that anyone with the VAPID private key can write to. We still encrypt them
// at rest to harden against passive DB dumps, but we accept a graceful
// degradation: if no encryption secret at all is available, we store plaintext
// JSON. Marker prefixes let us tell which format we're reading on decrypt.

const CIPHER = 'aes-256-gcm';
const FORMAT_ENCRYPTED = 'enc';
const FORMAT_PLAIN = 'plain';
const SALT = 'solara-plural.push-subscription.salt.v1';
const INFO = 'solara-plural.push-subscription.v1';

function readSecret(): string | null {
  const dedicated = process.env.PUSH_SUBSCRIPTION_SECRET?.trim();
  if (dedicated) return dedicated;

  const integration = process.env.INTEGRATIONS_TOKEN_SECRET?.trim();
  if (integration) return integration;

  // Fall back to the auth secret. In dev this is what crypto already did.
  // In prod this is a sensible default — push tokens are scoped per user and
  // exposing them is far less serious than exposing auth itself.
  const auth = process.env.NEXTAUTH_SECRET?.trim();
  if (auth) return auth;

  return null;
}

function deriveKey(secret: string): Buffer {
  return Buffer.from(hkdfSync(
    'sha256',
    Buffer.from(secret, 'utf8'),
    Buffer.from(SALT, 'utf8'),
    Buffer.from(INFO, 'utf8'),
    32,
  ));
}

export function encryptPushSubscription(json: string): string {
  const secret = readSecret();
  if (!secret) {
    // No secret at all — store plaintext with marker. We still log so the
    // operator can fix their config, but we DO NOT break notifications.
    return `${FORMAT_PLAIN}.${Buffer.from(json, 'utf8').toString('base64url')}`;
  }

  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, key, iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    FORMAT_ENCRYPTED,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptPushSubscription(payload: string): string {
  // Plaintext fallback format.
  if (payload.startsWith(`${FORMAT_PLAIN}.`)) {
    const b64 = payload.slice(FORMAT_PLAIN.length + 1);
    return Buffer.from(b64, 'base64url').toString('utf8');
  }

  // Encrypted format from this module.
  if (payload.startsWith(`${FORMAT_ENCRYPTED}.`)) {
    const [, ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid encrypted push subscription format.');
    }
    const secret = readSecret();
    if (!secret) throw new Error('Encrypted push token found but no decryption secret available.');
    const key = deriveKey(secret);
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const decipher = createDecipheriv(CIPHER, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  // Legacy format from the original integrations-token-crypto module. The
  // payload looks like `v2.iv.tag.data` (no marker prefix that matches ours).
  const [format, ivB64, tagB64, dataB64] = payload.split('.');
  if ((format === 'v1' || format === 'v2') && ivB64 && tagB64 && dataB64) {
    // Delegate to the legacy module to keep already-saved tokens working.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const legacy = require('@/lib/integrations/token-crypto') as typeof import('@/lib/integrations/token-crypto');
    return legacy.decryptIntegrationToken(payload);
  }

  throw new Error('Invalid push subscription payload.');
}

export function hashPushEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}
