// In-process pub/sub for live notification delivery.
//
// Scope: a single Node.js process. On Vercel serverless, two requests for the
// same user may land on different instances — in which case the SSE handler
// won't see the publish. The SSE endpoint itself polls the DB every few
// seconds as a safety net to catch cross-instance events, so this broker is
// a "fast path" not the only path.

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

type Listener = (notification: Notification) => void;

// Survives hot reload in dev by stashing on globalThis.
const globalForBroker = globalThis as unknown as {
  __solaraNotificationBroker?: Map<string, Set<Listener>>;
};

const subscribers: Map<string, Set<Listener>> =
  globalForBroker.__solaraNotificationBroker ?? new Map();
globalForBroker.__solaraNotificationBroker = subscribers;

export function subscribeToNotifications(systemId: string, listener: Listener): () => void {
  let set = subscribers.get(systemId);
  if (!set) {
    set = new Set();
    subscribers.set(systemId, set);
  }
  set.add(listener);

  return () => {
    const current = subscribers.get(systemId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) subscribers.delete(systemId);
  };
}

export function publishNotification(systemId: string, notification: Notification): void {
  const set = subscribers.get(systemId);
  if (!set || set.size === 0) return;
  // Snapshot before iterating so a listener that unsubscribes itself doesn't
  // disturb the loop.
  Array.from(set).forEach((listener) => {
    try {
      listener(notification);
    } catch (error) {
      // One bad listener shouldn't drop the broadcast.
      console.error('[notifications] broker listener threw', error);
    }
  });
}

export function listenerCountForTesting(systemId: string): number {
  return subscribers.get(systemId)?.size ?? 0;
}
