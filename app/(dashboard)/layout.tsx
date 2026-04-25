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
      <Sidebar systemName={systemName} />
      <main className="flex-1 md:ml-60 pb-20 md:pb-0">
        <DashboardClientProviders>
          <DashboardPrefetch />
          <div className="max-w-4xl mx-auto px-4 py-6">
            {children}
          </div>
        </DashboardClientProviders>
      </main>
      <MobileNav />
    </div>
  );
}
