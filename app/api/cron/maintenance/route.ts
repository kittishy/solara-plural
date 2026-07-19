import { db } from '@/lib/db';
import {
  systems,
  members,
  notifications,
  notificationDeliveries,
  notificationPushTokens,
  rateLimits,
  passwordResetTokens,
  adminAuditLog,
} from '@/lib/db/schema';
import { and, isNotNull, lt, lte, or, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily maintenance cron (see docs/SYSTEM_DESIGN.md §6).
 *
 * Scheduled by vercel.json; Vercel calls it with `Authorization: Bearer
 * $CRON_SECRET`. Fails closed: without the secret configured in production
 * the route refuses to run at all.
 *
 * Every step runs in its own try/catch so one failing table never blocks the
 * others — most importantly the account purge, which is a privacy guarantee
 * (the 72h deletion grace period is meaningless if the purge never runs).
 */

type StepResult = { deleted?: number; ms: number } | { error: string; ms: number };

async function step(
  summary: Record<string, StepResult>,
  name: string,
  run: () => Promise<number | undefined>,
): Promise<void> {
  const start = Date.now();
  try {
    const deleted = await run();
    summary[name] = { deleted: deleted ?? 0, ms: Date.now() - start };
  } catch (error) {
    summary[name] = {
      error: error instanceof Error ? error.message : 'unknown_error',
      ms: Date.now() - start,
    };
  }
}

function countOf(result: unknown): number {
  // drizzle's postgres-js delete returns an array-like with a `count`.
  if (Array.isArray(result)) return result.length;
  const c = (result as { count?: number } | null)?.count;
  return typeof c === 'number' ? c : 0;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed: an unconfigured cron must be loud, not silently public.
    if (process.env.NODE_ENV === 'production') {
      return Response.json({ success: false, error: 'CRON_SECRET is not configured' }, { status: 503 });
    }
    return Response.json({ success: false, error: 'CRON_SECRET is not configured (dev)' }, { status: 503 });
  }
  const header = request.headers.get('authorization');
  if (header !== `Bearer ${secret}`) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const summary: Record<string, StepResult> = {};
  const now = new Date();

  // 1. Account purge — the 72h-grace deletion GC. Every user-data table
  //    cascades from systems.id, so this single delete wipes the account.
  await step(summary, 'accountPurge', async () => {
    const purged = await db
      .delete(systems)
      .where(and(isNotNull(systems.deletionScheduledFor), lte(systems.deletionScheduledFor, now)))
      .returning({ id: systems.id });
    if (purged.length > 0) {
      await db.insert(adminAuditLog).values({
        id: createId(),
        actorSystemId: null,
        actorEmail: 'cron:maintenance',
        action: 'cron.account_purge',
        targetType: 'system',
        targetId: null,
        metadata: JSON.stringify({ count: purged.length }),
        createdAt: now,
      });
    }
    return purged.length;
  });

  // 2. Notifications: read ones after 60 days, everything after 90 days.
  await step(summary, 'notifications', async () => {
    const result = await db.delete(notifications).where(
      or(
        and(
          isNotNull(notifications.readAt),
          lt(notifications.createdAt, sql`now() - interval '60 days'`),
        ),
        lt(notifications.createdAt, sql`now() - interval '90 days'`),
      ),
    ).returning({ id: notifications.id });
    return countOf(result);
  });

  // 3. Delivery diagnostics only need a month of history.
  await step(summary, 'notificationDeliveries', async () => {
    const result = await db
      .delete(notificationDeliveries)
      .where(lt(notificationDeliveries.createdAt, sql`now() - interval '30 days'`))
      .returning({ id: notificationDeliveries.id });
    return countOf(result);
  });

  // 4. Rate-limit counters a day past their window (backs up the 2%
  //    opportunistic cleanup in lib/rate-limit.ts).
  await step(summary, 'rateLimits', async () => {
    const result = await db
      .delete(rateLimits)
      .where(lt(rateLimits.resetAt, sql`now() - interval '1 day'`))
      .returning({ key: rateLimits.key });
    return countOf(result);
  });

  // 5. Password-reset tokens: expired, or used more than a week ago.
  await step(summary, 'passwordResetTokens', async () => {
    const result = await db.delete(passwordResetTokens).where(
      or(
        lt(passwordResetTokens.expiresAt, sql`now() - interval '1 day'`),
        and(
          isNotNull(passwordResetTokens.usedAt),
          lt(passwordResetTokens.usedAt, sql`now() - interval '7 days'`),
        ),
      ),
    ).returning({ id: passwordResetTokens.id });
    return countOf(result);
  });

  // 6. Admin audit log: 180-day retention.
  await step(summary, 'adminAuditLog', async () => {
    const result = await db
      .delete(adminAuditLog)
      .where(lt(adminAuditLog.createdAt, sql`now() - interval '180 days'`))
      .returning({ id: adminAuditLog.id });
    return countOf(result);
  });

  // 7. Push tokens revoked a month ago are never coming back.
  await step(summary, 'revokedPushTokens', async () => {
    const result = await db
      .delete(notificationPushTokens)
      .where(
        and(
          isNotNull(notificationPushTokens.revokedAt),
          lt(notificationPushTokens.revokedAt, sql`now() - interval '30 days'`),
        ),
      )
      .returning({ id: notificationPushTokens.id });
    return countOf(result);
  });

  // 8. Metric only: total avatar bytes stored as data URLs, to watch the
  //    256px re-encode land over time (docs/SYSTEM_DESIGN.md §5).
  const metricStart = Date.now();
  try {
    const [memberBytes] = await db
      .select({
        count: sql<number>`count(*)`,
        bytes: sql<number>`coalesce(sum(length(${members.avatarUrl})), 0)`,
      })
      .from(members)
      .where(sql`${members.avatarUrl} LIKE 'data:%'`);
    const [systemBytes] = await db
      .select({
        count: sql<number>`count(*)`,
        bytes: sql<number>`coalesce(sum(length(${systems.avatarUrl})), 0)`,
      })
      .from(systems)
      .where(sql`${systems.avatarUrl} LIKE 'data:%'`);
    summary.avatarMetric = {
      deleted: 0,
      ms: Date.now() - metricStart,
    };
    return Response.json({
      success: true,
      data: {
        summary,
        avatars: {
          members: { count: Number(memberBytes?.count ?? 0), bytes: Number(memberBytes?.bytes ?? 0) },
          systems: { count: Number(systemBytes?.count ?? 0), bytes: Number(systemBytes?.bytes ?? 0) },
        },
      },
    });
  } catch (error) {
    summary.avatarMetric = {
      error: error instanceof Error ? error.message : 'unknown_error',
      ms: Date.now() - metricStart,
    };
    return Response.json({ success: true, data: { summary } });
  }
}
