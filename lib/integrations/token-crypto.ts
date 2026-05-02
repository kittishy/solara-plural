import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const CIPHER = 'aes-256-gcm';
const TOKEN_FORMAT = 'v1';

function getEncryptionKey(): Buffer {
  const secret = process.env.INTEGRATIONS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('INTEGRATIONS_TOKEN_SECRET (or NEXTAUTH_SECRET fallback) is required for integration token encryption.');
  }

  return createHash('sha256').update(secret).digest();
}

export function encryptIntegrationToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_FORMAT,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptIntegrationToken(payload: string): string {
  const [format, ivB64, tagB64, dataB64] = payload.split('.');
  if (format !== TOKEN_FORMAT || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted integration token format.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = createDecipheriv(CIPHER, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
