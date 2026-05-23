"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { Clock, Plus, X, Check } from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetcher, swrKeys, revalidateMembersAndFront } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  pronouns?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
};

type FrontEntry = {
  id: string;
  memberIds: string[];
  startedAt: string | number | Date;
  endedAt?: string | number | Date | null;
  note?: string | null;
};

function formatTime(value: string | number | Date) {
  const d = new Date(value);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | number | Date) {
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

export default function FrontPage() {
  const { data: currentFront, isLoading: loadingFront } = useSWR<FrontEntry | null>(
    swrKeys.front,
    apiFetcher
  );
  const { data: members, isLoading: loadingMembers } = useSWR<Member[]>(
    swrKeys.members,
    apiFetcher
  );
  const { data: historyData } = useSWR<FrontEntry[]>(
    swrKeys.frontHistory,
    apiFetcher
  );

  const [updating, setUpdating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const memberList = members ?? [];
  const memberById = new Map(memberList.map((m) => [m.id, m]));
  const frontingIds = currentFront ? currentFront.memberIds : [];
  const frontingSet = new Set(frontingIds);
  const history = historyData ?? [];

  async function toggleMember(memberId: string) {
    setUpdating(true);
    try {
      const isFronting = frontingSet.has(memberId);
      const newIds = isFronting
        ? frontingIds.filter((id) => id !== memberId)
        : [...frontingIds, memberId];

      if (newIds.length === 0) {
        await fetch("/api/front", {
          method: "DELETE",
          credentials: "same-origin",
        });
      } else {
        await fetch("/api/front", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds: newIds }),
        });
      }
      revalidateMembersAndFront();
      void mutate(swrKeys.frontHistory);
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
            <div className="p-4 flex gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : !currentFront || frontingIds.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-subheadline">
                Ninguém na frente agora
              </p>
            </div>
          ) : (
            frontingIds.map((id) => {
              const m = memberById.get(id);
              if (!m) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0"
                >
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{
                      background: m.color ? `${m.color}22` : "#8E8E9322",
                    }}
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
                    <p className="text-body font-semibold text-foreground">
                      {m.name}
                    </p>
                    <p className="text-caption-1 text-muted-foreground flex items-center gap-1">
                      <Clock size={11} />
                      desde {formatTime(currentFront.startedAt)}
                    </p>
                  </div>
                  <Badge variant="success">Frente</Badge>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

      {/* Member picker */}
      {showPicker && (
        <div className="px-4 mb-4 animate-slide-up">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Selecionar membros
          </p>
          <GlassCard padding="none" className="overflow-hidden">
            {loadingMembers ? (
              <div className="p-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : memberList.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-subheadline">
                Crie um membro primeiro
              </div>
            ) : (
              memberList.map((m) => {
                const isActive = frontingSet.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    disabled={updating}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition text-left disabled:opacity-50"
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{
                        background: m.color ? `${m.color}22` : "#8E8E9322",
                      }}
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
                    <span className="flex-1 text-body text-foreground">
                      {m.name}
                    </span>
                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-ios-blue flex items-center justify-center">
                        <Check size={14} className="text-white" strokeWidth={3} />
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
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
            Histórico
          </p>
          <a
            href="/front/history"
            className="text-subheadline text-ios-blue ios-press"
          >
            Ver tudo
          </a>
        </div>
        <GlassCard padding="none" className="overflow-hidden">
          {history.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-subheadline">
              Sem histórico ainda
            </div>
          ) : (
            history.slice(0, 8).map((entry) => {
              const memberNames = entry.memberIds
                .map((id) => memberById.get(id)?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-subheadline font-semibold text-foreground truncate">
                      {memberNames || "—"}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">
                      {formatDate(entry.startedAt)} · {formatTime(entry.startedAt)}
                      {entry.endedAt && ` → ${formatTime(entry.endedAt)}`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>
    </div>
  );
}
