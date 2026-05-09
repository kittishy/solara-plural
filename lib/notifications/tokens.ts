import { createHash } from 'crypto';
import { decryptIntegrationToken, encryptIntegrationToken } from '@/lib/integrations/token-crypto';

export function hashPushToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function encryptPushToken(token: string): string {
  return encryptIntegrationToken(token);
}

export function decryptPushToken(payload: string): string {
  return decryptIntegrationToken(payload);
}

