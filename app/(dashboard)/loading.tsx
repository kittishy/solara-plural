export default function DashboardLoading() {
  return (
    <div
      className="mx-auto min-h-[100dvh] max-w-3xl px-4 pb-28 pt-14"
      aria-busy="true"
    >
      <div className="h-4 w-36 animate-pulse rounded-full bg-muted" />
      <div className="mt-3 h-8 w-52 animate-pulse rounded-ios-sm bg-muted" />
      <div className="mt-6 h-72 animate-pulse rounded-ios-lg border border-border/70 bg-card" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-14 animate-pulse rounded-ios bg-muted" />
        <div className="h-14 animate-pulse rounded-ios bg-muted" />
      </div>
    </div>
  );
}
