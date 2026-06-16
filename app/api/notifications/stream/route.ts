import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { getSystemId } from '@/lib/api/helpers';
import { subscribeToNotifications } from '@/lib/notifications/realtime-broker';

// Server-Sent Events stream of new notifications for the current system.
//
// Two-layer delivery, designed for serverless:
//   1. The in-process broker fires `notify` events when the SAME instance
//      creates a notification. Instant in the common single-user case.
//   2. A 15-second DB poll catches notifications created on a DIFFERENT
//      Vercel instance from the one holding this SSE connection. 15s keeps
//      Vercel Fluid CPU usage low; push notifications remain instant.
//
// Connection is held open and yields heartbeats every 25s so proxies don't
// kill it. Client uses EventSource, which auto-reconnects on close.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Vercel hobby plan caps function duration at 60s. We auto-close at 55s and
// the client EventSource reconnects automatically.
export const maxDuration = 60;

const POLL_INTERVAL_MS = 15_000;
const HEARTBEAT_INTERVAL_MS = 25_000;

export async function GET() {
  const systemId = await getSystemId();
  if (!systemId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  // Track what we've sent. We dedupe by notification id (cheap & precise).
  let lastSentAt = new Date();
  const seenIds = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { closed = true; }
      };

      const sendNotification = (
        notification: { id: string; type: string; title: string; body: string; createdAt: string }
      ) => {
        if (seenIds.has(notification.id)) return;
        seenIds.add(notification.id);
        // Bound seenIds to avoid unbounded growth on a long-lived connection.
        if (seenIds.size > 500) {
          const iter = seenIds.values();
          for (let i = 0; i < 100; i++) {
            const next = iter.next();
            if (next.done) break;
            seenIds.delete(next.value);
          }
        }
        safeEnqueue(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
      };

      // 1) Subscribe to the in-process broker for instant local delivery.
      const unsubscribe = subscribeToNotifications(systemId, (notification) => {
        sendNotification(notification);
      });

      // 2) Poll the DB so we still catch notifications from other instances.
      const pollDb = async () => {
        try {
          const rows = await db.select({
            id: notifications.id,
            type: notifications.type,
            title: notifications.title,
            body: notifications.body,
            createdAt: notifications.createdAt,
          })
            .from(notifications)
            .where(and(
              eq(notifications.recipientSystemId, systemId),
              gt(notifications.createdAt, lastSentAt),
            ))
            .orderBy(notifications.createdAt)
            .limit(20);

          for (const row of rows) {
            const createdAt = row.createdAt instanceof Date
              ? row.createdAt
              : new Date((row.createdAt as unknown as number) * 1000);
            if (createdAt > lastSentAt) lastSentAt = createdAt;
            sendNotification({
              id: row.id,
              type: row.type,
              title: row.title,
              body: row.body,
              createdAt: createdAt.toISOString(),
            });
          }
        } catch (error) {
          console.error('[notifications] SSE poll failed', error);
        }
      };

      const pollInterval = setInterval(() => { void pollDb(); }, POLL_INTERVAL_MS);
      const heartbeat = setInterval(() => safeEnqueue(`: heartbeat\n\n`), HEARTBEAT_INTERVAL_MS);

      // Tell the browser to reconnect quickly (~1s) after a clean close, then
      // send an initial hello so the client knows the connection is live.
      safeEnqueue(`retry: 1000\n\n`);
      safeEnqueue(`event: ready\ndata: {}\n\n`);

      const cleanup = () => {
        closed = true;
        clearInterval(pollInterval);
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

      // Auto-close after ~55s so Vercel's 60s function limit doesn't kill us
      // mid-write. EventSource will reconnect automatically.
      setTimeout(cleanup, 55_000);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
