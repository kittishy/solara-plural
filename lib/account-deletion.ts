export const ACCOUNT_DELETION_RECOVERY_HOURS = 72;
export const ACCOUNT_DELETION_RECOVERY_MS = ACCOUNT_DELETION_RECOVERY_HOURS * 60 * 60 * 1000;

export function createDeletionWindow(now = new Date()) {
  const requestedAt = new Date(now);
  return {
    requestedAt,
    scheduledFor: new Date(requestedAt.getTime() + ACCOUNT_DELETION_RECOVERY_MS),
  };
}

export function isDeletionScheduled(system: {
  deletionRequestedAt?: Date | null;
  deletionScheduledFor?: Date | null;
}) {
  return Boolean(system.deletionRequestedAt && system.deletionScheduledFor);
}
