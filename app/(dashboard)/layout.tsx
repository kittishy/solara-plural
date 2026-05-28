import { TabBar } from "@/components/layout/TabBar";
import { NotificationRuntime } from "@/components/notifications/NotificationRuntime";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { requireSystemId } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSystemId();

  return (
    <div className="min-h-[100dvh] bg-[var(--ios-bg)]">
      <main className="pb-[calc(env(safe-area-inset-bottom,0px)+128px)]">{children}</main>
      <TabBar />
      <NotificationRuntime />
      <NotificationToast />
    </div>
  );
}
