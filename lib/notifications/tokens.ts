import { createHash } from 'crypto';
import { decryptIntegrationToken, encryptIntegrationToken } from '@/lib/integrations/token-crypto';

export function hashPushEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function encryptPushSubscription(subscriptionJson: string): string {
  return encryptIntegrationToken(subscriptionJson);
}

export function decryptPushSubscription(payload: string): string {
  return decryptIntegrationToken(payload);
}
