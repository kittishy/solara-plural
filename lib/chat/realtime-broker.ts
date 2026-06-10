// In-process pub/sub for live chat delivery — same design as the notification
// broker (lib/notifications/realtime-broker.ts): a fast path for the common
// case where the writer and the SSE reader share a Vercel instance. The SSE
// endpoint polls the DB as the safety net for cross-instance events.

export type ChatEvent = {
  messageId: string;
  channelId: string;
  createdAt: string;
};

type Listener = (event: ChatEvent) => void;

// Survives hot reload in dev by stashing on globalThis.
const globalForBroker = globalThis as unknown as {
  __solaraChatBroker?: Map<string, Set<Listener>>;
};

const subscribers: Map<string, Set<Listener>> =
  globalForBroker.__solaraChatBroker ?? new Map();
globalForBroker.__solaraChatBroker = subscribers;

export function subscribeToChatEvents(systemId: string, listener: Listener): () => void {
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

export function publishChatEvent(systemId: string, event: ChatEvent): void {
  const set = subscribers.get(systemId);
  if (!set || set.size === 0) return;
  Array.from(set).forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[chat] broker listener threw', error);
    }
  });
}
