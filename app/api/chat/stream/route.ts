import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemChatMessages } from '@/lib/db/schema';
import { getSystemId } from '@/lib/api/helpers';
import { subscribeToChatEvents } from '@/lib/chat/realtime-broker';

// Server-Sent Events stream of new chat messages for the current system.
// Mirrors /api/notifications/stream: in-process broker for the instant path,
// 15-second DB poll to catch messages written by a different Vercel instance.

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
  let lastSentAt = new Date();
  const seenIds = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { closed = true; }
      };

      const sendEvent = (event: { messageId: string; channelId: string; createdAt: string }) => {
        if (seenIds.has(event.messageId)) return;
        seenIds.add(event.messageId);
        if (seenIds.size > 500) {
          const iter = seenIds.values();
          for (let i = 0; i < 100; i++) {
            const next = iter.next();
            if (next.done) break;
            seenIds.delete(next.value);
          }
        }
        safeEnqueue(`event: message\ndata: ${JSON.stringify(event)}\n\n`);
      };

      // 1) In-process broker: instant when writer and reader share an instance.
      const unsubscribe = subscribeToChatEvents(systemId, (event) => {
        sendEvent(event);
      });

      // 2) DB poll: catches messages created on other instances.
      const pollDb = async () => {
        try {
          const rows = await db.select({
            id: systemChatMessages.id,
            channelId: systemChatMessages.channelId,
            createdAt: systemChatMessages.createdAt,
          })
            .from(systemChatMessages)
            .where(and(
              eq(systemChatMessages.systemId, systemId),
              gt(systemChatMessages.createdAt, lastSentAt),
            ))
            .orderBy(systemChatMessages.createdAt)
            .limit(50);

          for (const row of rows) {
            const createdAt = row.createdAt instanceof Date
              ? row.createdAt
              : new Date(row.createdAt as unknown as number);
            if (createdAt > lastSentAt) lastSentAt = createdAt;
            if (!row.channelId) continue;
            sendEvent({
              messageId: row.id,
              channelId: row.channelId,
              createdAt: createdAt.toISOString(),
            });
          }
        } catch (error) {
          console.error('[chat] SSE poll failed', error);
        }
      };

      const pollInterval = setInterval(() => { void pollDb(); }, POLL_INTERVAL_MS);
      const heartbeat = setInterval(() => safeEnqueue(`: heartbeat\n\n`), HEARTBEAT_INTERVAL_MS);

      safeEnqueue(`retry: 1000\n\n`);
      safeEnqueue(`event: ready\ndata: {}\n\n`);

      const cleanup = () => {
        closed = true;
        clearInterval(pollInterval);
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

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
