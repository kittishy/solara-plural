"use client";

import useSWR from "swr";
import { Users, Layers, BookOpen, MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { LargeTitle } from "@/components/layout/NavBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <GlassCard padding="md" className="flex flex-col gap-2">
      <div
        className="w-9 h-9 rounded-ios-sm flex items-center justify-center"
        style={{ background: `${color}20` }}
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
  );
}

export default function DashboardPage() {
  const { data: members, isLoading: loadingMembers } = useSWR(
    "/api/members",
    fetcher
  );
  const { data: front, isLoading: loadingFront } = useSWR(
    "/api/front",
    fetcher
  );
  const { data: journal, isLoading: loadingJournal } = useSWR(
    "/api/journal",
    fetcher
  );

  const fronting: any[] = front?.entries ?? [];
  const memberList: any[] = members?.members ?? [];
  const journalCount: number = journal?.entries?.length ?? 0;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2">
        <LargeTitle className="px-0">Início</LargeTitle>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-4">
        <StatCard
          icon={Users}
          label="membros"
          value={loadingMembers ? "—" : memberList.length}
          color="#007AFF"
        />
        <StatCard
          icon={Layers}
          label="na frente"
          value={loadingFront ? "—" : fronting.length}
          color="#34C759"
        />
        <StatCard
          icon={BookOpen}
          label="entradas"
          value={loadingJournal ? "—" : journalCount}
          color="#AF52DE"
        />
        <StatCard
          icon={MessageCircle}
          label="amigos"
          value="—"
          color="#FF9500"
        />
      </div>

      {/* Currently fronting */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Na frente agora
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {loadingFront ? (
            <div className="p-4 flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : fronting.length === 0 ? (
            <div className="p-5 text-center text-muted-foreground text-subheadline">
              Ninguém na frente registrado
            </div>
          ) : (
            fronting.map((entry: any, i: number) => (
              <div
                key={entry.id ?? i}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <Avatar className="w-10 h-10">
                  {entry.member?.avatarUrl && (
                    <AvatarImage src={entry.member.avatarUrl} />
                  )}
                  <AvatarFallback
                    style={{
                      background: entry.member?.color
                        ? `${entry.member.color}20`
                        : undefined,
                      color: entry.member?.color,
                    }}
                  >
                    {(entry.member?.name ?? "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-foreground truncate">
                    {entry.member?.name ?? "Membro"}
                  </p>
                  {entry.member?.pronouns && (
                    <p className="text-caption-1 text-muted-foreground">
                      {entry.member.pronouns}
                    </p>
                  )}
                </div>
                <Badge variant="success">Frente</Badge>
              </div>
            ))
          )}
        </GlassCard>
      </div>

      {/* Recent members */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Membros recentes
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {loadingMembers ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : memberList.length === 0 ? (
            <div className="p-5 text-center text-muted-foreground text-subheadline">
              Nenhum membro cadastrado ainda
            </div>
          ) : (
            memberList.slice(0, 5).map((member: any, i: number) => (
              <div
                key={member.id ?? i}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <Avatar className="w-10 h-10">
                  {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                  <AvatarFallback
                    style={{
                      background: member.color ? `${member.color}20` : undefined,
                      color: member.color,
                    }}
                  >
                    {(member.name ?? "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-foreground truncate">
                    {member.name}
                  </p>
                  {member.pronouns && (
                    <p className="text-caption-1 text-muted-foreground">
                      {member.pronouns}
                    </p>
                  )}
                </div>
                {member.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: member.color }}
                  />
                )}
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
}
