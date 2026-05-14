import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { DashboardClientProviders } from './DashboardClientProviders';
import { getAccountType, getCachedSession, requireSystemId } from '@/lib/auth/session';
import { Trans } from '@/components/language/Trans';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSystemId();
  const session = await getCachedSession();
  const systemName = session?.user?.name ?? undefined;
  const accountType = await getAccountType();

  return (
    <div className="min-h-dvh" style={{ background: 'var(--theme-bg)' }}>
      {/* Accessibility: skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
          focus:px-4 focus:py-2 focus:rounded-xl focus:ring-2"
        style={{
          background: 'var(--theme-surface)',
          color: 'var(--theme-primary)',
          outline: '2px solid var(--theme-primary)',
        }}
      >
        <Trans k="nav.skip" />
      </a>

      <Sidebar systemName={systemName} accountType={accountType} />

      <main id="main-content" className="relative flex-1 md:pt-14 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-dvh">
        {/* Static background — no aurora */}
        <div className="pointer-events-none fixed inset-0 z-0" style={{ background: 'var(--theme-bg)' }} aria-hidden="true" />
        <DashboardClientProviders>
          <div className="relative z-10 max-w-4xl mx-auto px-4 py-5 md:px-8 md:py-8">
            {children}
          </div>
        </DashboardClientProviders>
      </main>

      <MobileNav accountType={accountType} />
    </div>
  );
}
