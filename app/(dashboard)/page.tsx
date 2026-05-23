import Link from "next/link";
import { db } from "@/lib/db";
import {
  members,
  frontEntries,
  systemJournal,
  systemNotes,
  systems,
  systemFriendships,
  systemPartnerships,
} from "@/lib/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { requireSystemId } from "@/lib/auth/session";
import { parseMemberIds } from "@/lib/front";
import { parseStoredTags } from "@/lib/members/fields";
import { Users, Layers, BookOpen, FileText, Heart, UserPlus } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { LargeTitle } from "@/components/layout/NavBar";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { Badge } from "@/components/ui/badge";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <GlassCard padding="md" className="flex flex-col gap-2 ios-press ios-transition h-full">
        <div
          className="w-9 h-9 rounded-ios-sm flex items-center justify-center"
          style={{ background: `${color}22` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-title-2" style={{ color }}>
            {value}
          </p>
          <p className="text-caption-1 text-muted-foreground">{label}</p>
        </div>
      </GlassCard>
    </Link>
  );
}

export default async function DashboardPage() {
  const systemId = await requireSystemId();

  const [
    system,
    memberCount,
    activeFront,
    journalCount,
    noteCount,
    friendCount,
    partnerCount,
  ] = await Promise.all([
    db.query.systems.findFirst({
      columns: { name: true, description: true },
      where: eq(systems.id, systemId),
    }),
    db.query.members
      .findMany({
        columns: { id: true },
        where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
      })
      .then((r) => r.length),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
    db.query.systemJournal
      .findMany({
        columns: { id: true },
        where: eq(systemJournal.systemId, systemId),
      })
      .then((r) => r.length),
    db.query.systemNotes
      .findMany({
        columns: { id: true },
        where: eq(systemNotes.systemId, systemId),
      })
      .then((r) => r.length),
    db.query.systemFriendships
      .findMany({
        columns: { id: true },
        where: or(
          eq(systemFriendships.systemAId, systemId),
          eq(systemFriendships.systemBId, systemId)
        ),
      })
      .then((r) => r.length),
    db.query.systemPartnerships
      .findMany({
        columns: { id: true },
        where: or(
          eq(systemPartnerships.systemAId, systemId),
          eq(systemPartnerships.systemBId, systemId)
        ),
      })
      .then((r) => r.length),
  ]);

  const frontingIds = activeFront ? parseMemberIds(activeFront.memberIds) : [];
  const frontingMembers =
    frontingIds.length > 0
      ? await db.query.members.findMany({
          columns: {
            id: true,
            name: true,
            pronouns: true,
            color: true,
            avatarUrl: true,
          },
          where: (m, { inArray }) => inArray(m.id, frontingIds),
        })
      : [];

  const recentMembers = await db.query.members.findMany({
    columns: {
      id: true,
      name: true,
      pronouns: true,
      color: true,
      avatarUrl: true,
      tags: true,
      createdAt: true,
    },
    where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
    orderBy: (m, { desc: d }) => [d(m.createdAt)],
    limit: 5,
  });

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Olá, {system?.name ?? "Sistema"}
        </p>
        <LargeTitle className="px-0">Início</LargeTitle>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-5">
        <StatCard
          icon={Users}
          label="membros"
          value={memberCount}
          color="#007AFF"
          href="/members"
        />
        <StatCard
          icon={Layers}
          label="na frente"
          value={frontingMembers.length}
          color="#34C759"
          href="/front"
        />
        <StatCard
          icon={BookOpen}
          label="entradas"
          value={journalCount}
          color="#AF52DE"
          href="/journal"
        />
        <StatCard
          icon={FileText}
          label="notas"
          value={noteCount}
          color="#FF9500"
          href="/notes"
        />
        <StatCard
          icon={UserPlus}
          label="amigos"
          value={friendCount}
          color="#5AC8FA"
          href="/friends"
        />
        <StatCard
          icon={Heart}
          label="parcerias"
          value={partnerCount}
          color="#FF2D55"
          href="/partners"
        />
      </div>

      {/* Currently fronting */}
      <div className="px-4 mb-5">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Na frente agora
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {frontingMembers.length === 0 ? (
            <Link
              href="/front"
              className="block p-5 text-center text-muted-foreground text-subheadline active:bg-muted/30 ios-transition"
            >
              Ninguém na frente — toque para definir
            </Link>
          ) : (
            frontingMembers.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ background: m.color ? `${m.color}22` : "#8E8E9322" }}
                >
                  {m.avatarUrl ? (
                    <DynamicAvatarImage
                      src={m.avatarUrl}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className="text-body font-semibold"
                      style={{ color: m.color ?? "#8E8E93" }}
                    >
                      {m.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-foreground truncate">
                    {m.name}
                  </p>
                  {m.pronouns && (
                    <p className="text-caption-1 text-muted-foreground truncate">
                      {m.pronouns}
                    </p>
                  )}
                </div>
                <Badge variant="success">Frente</Badge>
              </Link>
            ))
          )}
        </GlassCard>
      </div>

      {/* Recent members */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
            Membros recentes
          </p>
          <Link
            href="/members"
            className="text-subheadline text-ios-blue ios-press"
          >
            Ver todos
          </Link>
        </div>
        <GlassCard padding="none" className="overflow-hidden">
          {recentMembers.length === 0 ? (
            <Link
              href="/members/new"
              className="block p-5 text-center text-muted-foreground text-subheadline active:bg-muted/30 ios-transition"
            >
              Nenhum membro ainda — toque para adicionar
            </Link>
          ) : (
            recentMembers.map((m) => {
              const tags = parseStoredTags(m.tags);
              return (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
                >
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ background: m.color ? `${m.color}22` : "#8E8E9322" }}
                  >
                    {m.avatarUrl ? (
                      <DynamicAvatarImage
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-subheadline font-semibold"
                        style={{ color: m.color ?? "#8E8E93" }}
                      >
                        {m.name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {m.name}
                    </p>
                    {m.pronouns ? (
                      <p className="text-caption-1 text-muted-foreground truncate">
                        {m.pronouns}
                      </p>
                    ) : tags.length > 0 ? (
                      <p className="text-caption-1 text-muted-foreground truncate">
                        {tags.slice(0, 2).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {m.color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: m.color }}
                    />
                  )}
                </Link>
              );
            })
          )}
        </GlassCard>
      </div>
    </div>
  );
}
