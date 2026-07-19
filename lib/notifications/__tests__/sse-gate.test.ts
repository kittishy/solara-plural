import { describe, expect, it } from 'vitest';
import { shouldOpenSseStream } from '@/lib/notifications/sse-gate';

describe('shouldOpenSseStream', () => {
  it('never opens SSE inside the Capacitor-native app (FCM covers realtime)', () => {
    expect(shouldOpenSseStream({ permission: 'granted', isCapacitorNative: true })).toBe(false);
    expect(shouldOpenSseStream({ permission: 'denied', isCapacitorNative: true })).toBe(false);
    expect(shouldOpenSseStream({ permission: 'default', isCapacitorNative: true })).toBe(false);
    expect(shouldOpenSseStream({ permission: null, isCapacitorNative: true })).toBe(false);
  });

  it('never opens SSE when push permission is granted (service worker covers realtime)', () => {
    expect(shouldOpenSseStream({ permission: 'granted', isCapacitorNative: false })).toBe(false);
  });

  it('falls back to SSE when push is denied or undecided', () => {
    expect(shouldOpenSseStream({ permission: 'denied', isCapacitorNative: false })).toBe(true);
    expect(shouldOpenSseStream({ permission: 'default', isCapacitorNative: false })).toBe(true);
  });

  it('falls back to SSE when the Notification API does not exist', () => {
    expect(shouldOpenSseStream({ permission: null, isCapacitorNative: false })).toBe(true);
  });
});
