import { TabBar } from "@/components/layout/TabBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--ios-bg)]">
      <main className="pb-32">{children}</main>
      <TabBar />
    </div>
  );
}
