import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  subscribeToNotifications,
  publishNotification,
  listenerCountForTesting,
} from '../notifications/realtime-broker';

const sampleNotification = {
  id: 'n-1',
  type: 'friend_front_changed',
  title: 'Test',
  body: 'Hello',
  createdAt: new Date('2026-05-27T10:00:00Z').toISOString(),
};

describe('realtime broker', () => {
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    // Reset by unsubscribing any leftover listeners.
    while (cleanups.length) cleanups.pop()!();
  });

  afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
  });

  it('delivers a published notification to a subscribed listener', () => {
    const received: Array<typeof sampleNotification> = [];
    cleanups.push(subscribeToNotifications('sys-a', (n) => received.push(n)));

    publishNotification('sys-a', sampleNotification);

    expect(received).toEqual([sampleNotification]);
  });

  it('does not deliver notifications across systems', () => {
    const received: Array<typeof sampleNotification> = [];
    cleanups.push(subscribeToNotifications('sys-a', (n) => received.push(n)));

    publishNotification('sys-b', sampleNotification);

    expect(received).toEqual([]);
  });

  it('supports multiple listeners for the same system', () => {
    const r1: typeof sampleNotification[] = [];
    const r2: typeof sampleNotification[] = [];
    cleanups.push(subscribeToNotifications('sys-c', (n) => r1.push(n)));
    cleanups.push(subscribeToNotifications('sys-c', (n) => r2.push(n)));

    publishNotification('sys-c', sampleNotification);

    expect(r1).toEqual([sampleNotification]);
    expect(r2).toEqual([sampleNotification]);
  });

  it('unsubscribes cleanly when the returned disposer is called', () => {
    const received: typeof sampleNotification[] = [];
    const dispose = subscribeToNotifications('sys-d', (n) => received.push(n));

    publishNotification('sys-d', sampleNotification);
    dispose();
    publishNotification('sys-d', { ...sampleNotification, id: 'n-2' });

    expect(received).toEqual([sampleNotification]);
    expect(listenerCountForTesting('sys-d')).toBe(0);
  });

  it('survives a throwing listener and keeps delivering to others', () => {
    const received: typeof sampleNotification[] = [];
    cleanups.push(subscribeToNotifications('sys-e', () => { throw new Error('boom'); }));
    cleanups.push(subscribeToNotifications('sys-e', (n) => received.push(n)));

    publishNotification('sys-e', sampleNotification);

    expect(received).toEqual([sampleNotification]);
  });
});
