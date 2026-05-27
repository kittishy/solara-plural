// Push subscription persistence helpers. Re-exports from the dedicated
// push-subscription crypto so the rest of the codebase keeps importing from
// the same place, but the encryption is now resilient to a missing
// INTEGRATIONS_TOKEN_SECRET in production.

export {
  encryptPushSubscription,
  decryptPushSubscription,
  hashPushEndpoint,
} from '@/lib/notifications/push-subscription-crypto';
