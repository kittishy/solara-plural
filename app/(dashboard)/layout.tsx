import { redirect } from "next/navigation";
import { TabBar } from "@/components/layout/TabBar";
import { NotificationRuntime } from "@/components/notifications/NotificationRuntime";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { requireSystemId } from "@/lib/auth/session";
import { getIsAdmin } from "@/lib/auth/admin";
import { isMaintenanceMode } from "@/lib/admin/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSystemId();

  // While maintenance mode is on, only admins keep access to the main app;
  // everyone else is parked on the maintenance screen.
  const [maintenance, admin] = await Promise.all([isMaintenanceMode(), getIsAdmin()]);
  if (maintenance && !admin) {
    redirect("/maintenance");
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--ios-bg)]">
      <main className="pb-[calc(env(safe-area-inset-bottom,0px)+128px)]">{children}</main>
      <TabBar />
      <NotificationRuntime />
      <NotificationToast />
    </div>
  );
}
