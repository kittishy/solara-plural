"use client";

// Error boundary scoped to the dashboard. Because it sits inside the dashboard
// layout, a crash on one page shows this recoverable UI while the TabBar stays
// mounted — so the other tabs keep working instead of the whole app going blank.

import { ErrorScreen } from "@/components/errors/ErrorScreen";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} withShell />;
}
