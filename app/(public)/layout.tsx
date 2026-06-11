// Public, unauthenticated shell for shareable pages (e.g. /u/<slug>).
// Deliberately has no TabBar, no session gate, and no app chrome — just the
// page content on the app background.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[var(--ios-bg)]">
      <main className="pb-[calc(env(safe-area-inset-bottom,0px)+48px)]">
        {children}
      </main>
    </div>
  );
}
