import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'crypto';

const CIPHER = 'aes-256-gcm';
const TOKEN_FORMAT_V1 = 'v1';
const TOKEN_FORMAT_V2 = 'v2';
const TOKEN_V2_SALT = 'solara-plural.integration-token.salt.v2';
const TOKEN_V2_INFO = 'solara-plural.integration-token.v2';

function readPrimarySecret(): string {
  const integrationSecret = process.env.INTEGRATIONS_TOKEN_SECRET?.trim();
  if (integrationSecret) return integrationSecret;

  const fallbackSecret = process.env.NEXTAUTH_SECRET?.trim();
  if (process.env.NODE_ENV !== 'production' && fallbackSecret) {
    return fallbackSecret;
  }

  throw new Error('INTEGRATIONS_TOKEN_SECRET is required for integration token encryption.');
}

function readLegacySecrets(): string[] {
  const secrets = [
    process.env.INTEGRATIONS_TOKEN_SECRET?.trim(),
    process.env.INTEGRATIONS_LEGACY_TOKEN_SECRET?.trim(),
  ].filter((value): value is string => Boolean(value));

  const fallbackSecret = process.env.NEXTAUTH_SECRET?.trim();
  if (process.env.NODE_ENV !== 'production' && fallbackSecret) {
    secrets.push(fallbackSecret);
  }

  return Array.from(new Set(secrets));
}

function getV1EncryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

function getV2EncryptionKey(secret: string): Buffer {
  return Buffer.from(hkdfSync(
    'sha256',
    Buffer.from(secret, 'utf8'),
    Buffer.from(TOKEN_V2_SALT, 'utf8'),
    Buffer.from(TOKEN_V2_INFO, 'utf8'),
    32,
  ));
}

function decryptWithKey(ivB64: string, tagB64: string, dataB64: string, key: Buffer): string {
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = createDecipheriv(CIPHER, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

export function encryptIntegrationToken(token: string): string {
  const key = getV2EncryptionKey(readPrimarySecret());
  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_FORMAT_V2,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptIntegrationToken(payload: string): string {
  const [format, ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted integration token format.');
  }

  if (format === TOKEN_FORMAT_V2) {
    return decryptWithKey(ivB64, tagB64, dataB64, getV2EncryptionKey(readPrimarySecret()));
  }

  if (format === TOKEN_FORMAT_V1) {
    const secrets = readLegacySecrets();
    for (const secret of secrets) {
      try {
        return decryptWithKey(ivB64, tagB64, dataB64, getV1EncryptionKey(secret));
      } catch {
        // Try the next configured legacy secret.
      }
    }
  }

  throw new Error('Invalid encrypted integration token format.');
}
