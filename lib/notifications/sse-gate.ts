// Decides whether a client should open the /api/notifications/stream SSE
// connection.
//
// The SSE stream is the single most expensive thing a client can do to the
// Vercel free tier: each open tab holds a ~55s serverless invocation that
// recycles continuously (docs/SYSTEM_DESIGN.md §5). It is therefore a
// FALLBACK, not the default:
//
// - Capacitor-native sessions get realtime via FCM — never open SSE.
// - Browser tabs with push permission granted get realtime via the service
//   worker's 'solara-push' message (which triggers SWR revalidation) — never
//   open SSE.
// - Only tabs where push is unavailable (denied, not yet decided, or no
//   Notification API at all) fall back to SSE so they still get live updates.

export type SseGateInput = {
  /** `Notification.permission`, or null when the API doesn't exist. */
  permission: NotificationPermission | null;
  /** True inside the Capacitor-wrapped Android app. */
  isCapacitorNative: boolean;
};

export function shouldOpenSseStream({ permission, isCapacitorNative }: SseGateInput): boolean {
  if (isCapacitorNative) return false;
  if (permission === 'granted') return false;
  return true;
}
