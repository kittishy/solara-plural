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
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral do Solara</p>
      </div>

      {maintenance.enabled && (
        <GlassCard className="flex items-center gap-3 border border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="text-amber-500" size={20} />
          <div className="text-sm">
            <strong>Modo manutenção ativo.</strong> O app principal está bloqueado para usuários comuns.
          </div>
        </GlassCard>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contas totais" value={metrics.totalAccounts} />
        <StatCard label="Novas (7 dias)" value={metrics.newAccounts7d} accent="green" hint={`${metrics.newAccounts30d} nos últimos 30 dias`} />
        <StatCard label="Suspensas" value={metrics.suspendedAccounts} accent={metrics.suspendedAccounts > 0 ? "red" : undefined} />
        <StatCard label="Administradores" value={metrics.adminAccounts} accent="blue" />
        <StatCard label="Sistemas" value={metrics.systemAccounts} />
        <StatCard label="Singlets" value={metrics.singletAccounts} />
        <StatCard label="Membros (alters)" value={metrics.totalMembers} />
        <StatCard label="Fronts ativos" value={metrics.activeFronts} accent="green" />
        <StatCard label="Anotações" value={metrics.totalNotes} />
        <StatCard label="Entradas de diário" value={metrics.totalJournalEntries} />
        <StatCard label="Amizades" value={metrics.totalFriendships} />
        <StatCard label="Pedidos pendentes" value={metrics.pendingFriendRequests} accent={metrics.pendingFriendRequests > 0 ? "amber" : undefined} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cadastros (últimos 30 dias)</h2>
        <GlassCard>
          <SignupsChart data={metrics.signupsByDay} />
        </GlassCard>
      </section>
    </div>
  );
}
