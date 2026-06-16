import { getAdminMetrics } from "@/lib/admin/metrics";
import { getMaintenanceState } from "@/lib/admin/settings";
import { StatCard } from "@/components/admin/StatCard";
import { GlassCard } from "@/components/glass/GlassCard";
import { SignupsChart } from "@/components/admin/SignupsChart";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metrics, maintenance] = await Promise.all([
    getAdminMetrics(),
    getMaintenanceState(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Solara overview</p>
      </div>

      {maintenance.enabled && (
        <GlassCard className="flex items-center gap-3 border border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="text-amber-500" size={20} />
          <div className="text-sm">
            <strong>Maintenance mode active.</strong> The main app is blocked for regular users.
          </div>
        </GlassCard>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total accounts" value={metrics.totalAccounts} />
        <StatCard label="New (7 days)" value={metrics.newAccounts7d} accent="green" hint={`${metrics.newAccounts30d} in the last 30 days`} />
        <StatCard label="Suspended" value={metrics.suspendedAccounts} accent={metrics.suspendedAccounts > 0 ? "red" : undefined} />
        <StatCard label="Administrators" value={metrics.adminAccounts} accent="blue" />
        <StatCard label="Systems" value={metrics.systemAccounts} />
        <StatCard label="Singlets" value={metrics.singletAccounts} />
        <StatCard label="Members (alters)" value={metrics.totalMembers} />
        <StatCard label="Active fronts" value={metrics.activeFronts} accent="green" />
        <StatCard label="Notes" value={metrics.totalNotes} />
        <StatCard label="Journal entries" value={metrics.totalJournalEntries} />
        <StatCard label="Friendships" value={metrics.totalFriendships} />
        <StatCard label="Pending requests" value={metrics.pendingFriendRequests} accent={metrics.pendingFriendRequests > 0 ? "amber" : undefined} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Signups (last 30 days)</h2>
        <GlassCard>
          <SignupsChart data={metrics.signupsByDay} />
        </GlassCard>
      </section>
    </div>
  );
}
