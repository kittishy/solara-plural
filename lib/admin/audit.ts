import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { adminAuditLog } from '@/lib/db/schema';

interface AuditInput {
  actorSystemId: string;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Record a privileged admin action. Best-effort: a logging failure must never
 * block the action it describes, so errors are swallowed after being surfaced
 * to the server console.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(adminAuditLog).values({
      id: createId(),
      actorSystemId: input.actorSystemId,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('[admin-audit] failed to record action', input.action, e);
  }
}
