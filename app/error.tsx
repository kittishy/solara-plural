"use client";

// Route-level error boundary for any segment without a closer boundary
// (auth, admin, marketing pages). Renders within the root providers, so the
// shared ErrorScreen can localize itself.

import { ErrorScreen } from "@/components/errors/ErrorScreen";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} />;
}
