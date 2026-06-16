import { db } from "@/lib/db";
import {
  systems,
  systemFriendRequests,
  systemBlocks,
} from "@/lib/db/schema";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { GlassCard } from "@/components/glass/GlassCard";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const sender = alias(systems, "sender");
  const receiver = alias(systems, "receiver");
  const blocker = alias(systems, "blocker");
  const blocked = alias(systems, "blocked");

  const [pendingRequests, recentBlocks, suspended, dbVersion] = await Promise.all([
    db
      .select({
        id: systemFriendRequests.id,
        status: systemFriendRequests.status,
        createdAt: systemFriendRequests.createdAt,
        senderName: sender.name,
        senderEmail: sender.email,
        receiverName: receiver.name,
        receiverEmail: receiver.email,
      })
      .from(systemFriendRequests)
      .leftJoin(sender, eq(systemFriendRequests.senderSystemId, sender.id))
      .leftJoin(receiver, eq(systemFriendRequests.receiverSystemId, receiver.id))
      .where(eq(systemFriendRequests.status, "pending"))
      .orderBy(desc(systemFriendRequests.createdAt))
      .limit(50),
    db
      .select({
        id: systemBlocks.id,
        createdAt: systemBlocks.createdAt,
        blockerName: blocker.name,
        blockedName: blocked.name,
      })
      .from(systemBlocks)
      .leftJoin(blocker, eq(systemBlocks.blockerSystemId, blocker.id))
      .leftJoin(blocked, eq(systemBlocks.blockedSystemId, blocked.id))
      .orderBy(desc(systemBlocks.createdAt))
      .limit(50),
    db
      .select({
        id: systems.id,
        name: systems.name,
        email: systems.email,
        suspendedAt: systems.suspendedAt,
        suspendedReason: systems.suspendedReason,
      })
      .from(systems)
      .where(isNotNull(systems.suspendedAt))
      .orderBy(desc(systems.suspendedAt))
      .limit(50),
    db.execute(sql`select version() as version`).catch(() => null),
  ]);

  const version =
    dbVersion && Array.isArray(dbVersion) && dbVersion[0]
      ? String((dbVersion[0] as { version?: string }).version ?? "")
      : "unavailable";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderation & Health</h1>
        <p className="text-sm text-muted-foreground">Requests, blocks, suspensions, and system status</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending requests" value={pendingRequests.length} accent={pendingRequests.length ? "amber" : undefined} />
        <StatCard label="Recent blocks" value={recentBlocks.length} />
        <StatCard label="Suspended accounts" value={suspended.length} accent={suspended.length ? "red" : undefined} />
        <StatCard label="Database" value="OK" accent="green" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Suspended accounts</h2>
        {suspended.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suspended accounts.</p>
        ) : (
          <div className="space-y-2">
            {suspended.map((s) => (
              <GlassCard key={s.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="destructive">suspended</Badge>
                  <span className="text-xs text-muted-foreground">{s.email}</span>
                </div>
                {s.suspendedReason && <p className="text-sm text-muted-foreground">{s.suspendedReason}</p>}
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pending friend requests</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((r) => (
              <GlassCard key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{r.senderName ?? "?"}</strong> → <strong>{r.receiverName ?? "?"}</strong>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("en-US")}
                </span>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent blocks</h2>
        {recentBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks recorded.</p>
        ) : (
          <div className="space-y-2">
            {recentBlocks.map((b) => (
              <GlassCard key={b.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{b.blockerName ?? "?"}</strong> blocked <strong>{b.blockedName ?? "?"}</strong>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(b.createdAt).toLocaleDateString("en-US")}
                </span>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">System health</h2>
        <GlassCard className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Database</span>
            <span className="text-right font-mono text-xs">{version}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Environment</span>
            <span>{process.env.NODE_ENV}</span>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
