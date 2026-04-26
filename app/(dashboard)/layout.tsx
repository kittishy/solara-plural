import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { DashboardPrefetch } from '@/components/layout/DashboardPrefetch';
import { DashboardClientProviders } from './DashboardClientProviders';
import { getCachedSession } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();
  const systemName = session?.user?.name ?? undefined;

  return (
    <div className="min-h-dvh bg-bg flex">
      {/* Accessibility: skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
          focus:px-4 focus:py-2 focus:bg-surface focus:text-primary focus:rounded-xl
          focus:ring-2 focus:ring-primary focus:shadow-card"
      >
        Skip to main content
      </a>

      <Sidebar systemName={systemName} />

      <main id="main-content" className="flex-1 md:ml-60 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-dvh">
        <DashboardClientProviders>
          <DashboardPrefetch />
          <div className="max-w-4xl mx-auto px-4 py-5 md:px-8 md:py-8">
            {children}
          </div>
        </DashboardClientProviders>
      </main>

      <MobileNav />
    </div>
  );
}
