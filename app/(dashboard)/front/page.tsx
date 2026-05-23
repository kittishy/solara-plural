"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

export default function FrontPage() {
  const { data: frontData, isLoading: loadingFront } = useSWR(
    "/api/front",
    fetcher
  );
  const { data: membersData, isLoading: loadingMembers } = useSWR(
    "/api/members",
    fetcher
  );
  const { data: historyData, isLoading: loadingHistory } = useSWR(
    "/api/front/history",
    fetcher
  );

  const [showPicker, setShowPicker] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fronting: any[] = frontData?.entries ?? [];
  const members: any[] = membersData?.members ?? [];
  const history: any[] = historyData?.entries ?? [];
  const frontingIds = new Set(fronting.map((e: any) => e.memberId));

  async function toggleMember(memberId: string) {
    setUpdating(true);
    try {
      if (frontingIds.has(memberId)) {
        const entry = fronting.find((e: any) => e.memberId === memberId);
        if (entry) {
          await fetch(`/api/front/history/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endTime: new Date().toISOString() }),
          });
        }
      } else {
        await fetch("/api/front", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        });
      }
      mutate("/api/front");
      mutate("/api/front/history");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">Frente</LargeTitle>
        <Button
          size="icon"
          className="mb-1"
          onClick={() => setShowPicker(!showPicker)}
        >
          {showPicker ? <X size={20} /> : <Plus size={20} />}
        </Button>
      </div>

      {/* Currently fronting */}
      <div className="px-4 mb-4">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Agora
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {loadingFront ? (
            <div className="p-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ) : fronting.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-subheadline">
                Ninguém na frente agora
              </p>
            </div>
          ) : (
            fronting.map((entry: any, i: number) => (
              <div
                key={entry.id ?? i}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0"
              >
                <Avatar className="w-12 h-12">
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
                  <p className="text-body font-semibold text-foreground">
                    {entry.member?.name ?? "Membro"}
                  </p>
                  <p className="text-caption-1 text-muted-foreground flex items-center gap-1">
                    <Clock size={11} />
                    desde {formatTime(entry.startTime)}
                  </p>
                </div>
                <Badge variant="success">Frente</Badge>
              </div>
            ))
          )}
        </GlassCard>
      </div>

      {/* Member picker */}
      {showPicker && (
        <div className="px-4 mb-4 animate-slide-up">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Selecionar membro
          </p>
          <GlassCard padding="none" className="overflow-hidden">
            {loadingMembers ? (
              <div className="p-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              members.map((member: any, i: number) => {
                const isActive = frontingIds.has(member.id);
                return (
                  <button
                    key={member.id ?? i}
                    onClick={() => toggleMember(member.id)}
                    disabled={updating}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition text-left"
                  >
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {member.avatarUrl && (
                        <AvatarImage src={member.avatarUrl} />
                      )}
                      <AvatarFallback
                        style={{
                          background: member.color
                            ? `${member.color}20`
                            : undefined,
                          color: member.color,
                        }}
                      >
                        {(member.name ?? "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-body text-foreground">
                      {member.name}
                    </span>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-ios-blue flex items-center justify-center">
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                        >
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </GlassCard>
        </div>
      )}

      {/* History */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Histórico
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {loadingHistory ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-subheadline">
              Sem histórico ainda
            </div>
          ) : (
            history.slice(0, 10).map((entry: any, i: number) => (
              <div
                key={entry.id ?? i}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
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
                  <p className="text-subheadline font-semibold text-foreground truncate">
                    {entry.member?.name ?? "Membro"}
                  </p>
                  <p className="text-caption-1 text-muted-foreground">
                    {formatDate(entry.startTime)} ·{" "}
                    {formatTime(entry.startTime)}
                    {entry.endTime && ` → ${formatTime(entry.endTime)}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
}
