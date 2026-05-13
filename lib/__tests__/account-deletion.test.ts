import { describe, it, expect } from 'vitest';
import {
  createDeletionWindow,
  isDeletionScheduled,
  ACCOUNT_DELETION_RECOVERY_HOURS,
} from '../account-deletion';

describe('createDeletionWindow', () => {
  it('schedules deletion exactly ACCOUNT_DELETION_RECOVERY_HOURS in the future', () => {
    const now = new Date('2026-05-12T12:00:00Z');
    const { requestedAt, scheduledFor } = createDeletionWindow(now);

    expect(requestedAt).toEqual(now);
    const diffHours = (scheduledFor.getTime() - requestedAt.getTime()) / (60 * 60 * 1000);
    expect(diffHours).toBe(ACCOUNT_DELETION_RECOVERY_HOURS);
  });

  it('uses current time when no argument is provided', () => {
    const before = Date.now();
    const { requestedAt } = createDeletionWindow();
    const after = Date.now();

    expect(requestedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(requestedAt.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('isDeletionScheduled', () => {
  it('returns true when both dates are present', () => {
    expect(isDeletionScheduled({
      deletionRequestedAt: new Date(),
      deletionScheduledFor: new Date(),
    })).toBe(true);
  });

  it('returns false when either date is null', () => {
    expect(isDeletionScheduled({ deletionRequestedAt: null, deletionScheduledFor: new Date() })).toBe(false);
    expect(isDeletionScheduled({ deletionRequestedAt: new Date(), deletionScheduledFor: null })).toBe(false);
  });

  it('returns false when both dates are absent', () => {
    expect(isDeletionScheduled({})).toBe(false);
  });
});
