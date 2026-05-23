import { TabBar } from "@/components/layout/TabBar";
import { NotificationRuntime } from "@/components/notifications/NotificationRuntime";
import { requireSystemId } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSystemId();

  return (
    <div className="min-h-screen bg-[var(--ios-bg)]">
      <main className="pb-32">{children}</main>
      <TabBar />
      <NotificationRuntime />
    </div>
  );
}
