import { db } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "user.update": "Account updated",
  "user.delete": "Account deleted",
  "user.reset_password": "Password reset",
  "settings.update": "Settings updated",
  "announcement.create": "Announcement created",
  "announcement.update": "Announcement updated",
  "announcement.delete": "Announcement deleted",
};

export default async function AdminAuditPage() {
  const entries = await db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(200);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Administrative action log (latest 200)</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <GlassCard key={e.id} className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{ACTION_LABELS[e.action] ?? e.action}</Badge>
                {e.targetType && (
                  <span className="text-xs text-muted-foreground">
                    {e.targetType}
                    {e.targetId ? `: ${e.targetId}` : ""}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("en-US")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">by {e.actorEmail ?? e.actorSystemId ?? "?"}</p>
              {e.metadata && (
                <pre className="overflow-x-auto rounded bg-muted/60 p-2 text-[11px] text-muted-foreground">
                  {e.metadata}
                </pre>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
