"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import {
  UserPlus,
  Check,
  X,
  Ban,
  Users as UsersIcon,
  Mail,
} from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { cn } from "@/lib/utils";

type SystemSummary = {
  id: string;
  name: string;
  accountType?: string;
  description?: string | null;
  avatarMode?: string;
  avatarEmoji?: string;
  avatarUrl?: string | null;
};

type FriendsPayload = {
  friends: (SystemSummary & {
    friendshipId: string;
    connectedAt: string;
  })[];
  incomingRequests: {
    friendshipId: string;
    from: SystemSummary;
    message?: string | null;
    createdAt: string;
  }[];
  outgoingRequests: {
    friendshipId: string;
    to: SystemSummary;
    message?: string | null;
    createdAt: string;
  }[];
  blocks: {
    blockedByMe: { system: SystemSummary; createdAt: string }[];
    blockedMe: { system: SystemSummary; createdAt: string }[];
  };
};

function SystemAvatar({
  system,
  size = 40,
}: {
  system: SystemSummary;
  size?: number;
}) {
  if (system.avatarMode === "url" && system.avatarUrl) {
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <DynamicAvatarImage
          src={system.avatarUrl}
          alt={system.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xl"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {system.avatarEmoji || "☀️"}
    </div>
  );
}

export default function FriendsPage() {
  const { data, isLoading } = useSWR<FriendsPayload>(
    swrKeys.friends,
    apiFetcher
  );

  const [tab, setTab] = useState<"friends" | "received" | "sent" | "blocked">(
    "friends"
  );
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState("");

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setSending(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          message: inviteMessage.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setInviteError(json.error ?? "Erro ao enviar pedido");
        return;
      }
      setInviteEmail("");
      setInviteMessage("");
      setShowInvite(false);
      void mutate(swrKeys.friends);
    } finally {
      setSending(false);
    }
  }

  async function respondRequest(id: string, action: "accept" | "decline") {
    await fetch(`/api/friends/requests/${id}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    void mutate(swrKeys.friends);
  }

  async function unblock(systemId: string) {
    await fetch(`/api/friends/blocks/${systemId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    void mutate(swrKeys.friends);
  }

  const friends = data?.friends ?? [];
  const incoming = data?.incomingRequests ?? [];
  const outgoing = data?.outgoingRequests ?? [];
  const blockedByMe = data?.blocks?.blockedByMe ?? [];

  const tabs = [
    { id: "friends", label: "Amigos", count: friends.length },
    { id: "received", label: "Recebidos", count: incoming.length },
    { id: "sent", label: "Enviados", count: outgoing.length },
    { id: "blocked", label: "Bloqueados", count: blockedByMe.length },
  ] as const;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">Amigos</LargeTitle>
        <Button size="icon" className="mb-1" onClick={() => setShowInvite(true)}>
          <UserPlus size={20} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-ios-md bg-secondary overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-ios-sm text-caption-1 font-semibold ios-transition whitespace-nowrap",
                tab === t.id
                  ? "bg-white dark:bg-ios-gray-3/30 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1 text-ios-blue">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : tab === "friends" ? (
            friends.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-subheadline">
                Nenhum amigo ainda
              </div>
            ) : (
              friends.map((f) => (
                <a
                  key={f.friendshipId}
                  href={`/systems/${f.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
                >
                  <SystemAvatar system={f} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {f.name}
                    </p>
                    {f.description && (
                      <p className="text-caption-1 text-muted-foreground truncate">
                        {f.description}
                      </p>
                    )}
                  </div>
                </a>
              ))
            )
          ) : tab === "received" ? (
            incoming.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-subheadline">
                Nenhum pedido recebido
              </div>
            ) : (
              incoming.map((r) => (
                <div
                  key={r.friendshipId}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <SystemAvatar system={r.from} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {r.from.name}
                    </p>
                    {r.message && (
                      <p className="text-caption-1 text-muted-foreground truncate">
                        “{r.message}”
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => respondRequest(r.friendshipId, "decline")}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center ios-press"
                    aria-label="Recusar"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => respondRequest(r.friendshipId, "accept")}
                    className="w-9 h-9 rounded-full bg-ios-blue text-white flex items-center justify-center ios-press"
                    aria-label="Aceitar"
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              ))
            )
          ) : tab === "sent" ? (
            outgoing.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-subheadline">
                Nenhum pedido enviado
              </div>
            ) : (
              outgoing.map((r) => (
                <div
                  key={r.friendshipId}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <SystemAvatar system={r.to} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {r.to.name}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">
                      Aguardando resposta
                    </p>
                  </div>
                  <button
                    onClick={() => respondRequest(r.friendshipId, "decline")}
                    className="text-subheadline text-ios-red ios-press"
                  >
                    Cancelar
                  </button>
                </div>
              ))
            )
          ) : (
            blockedByMe.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-subheadline">
                Ninguém bloqueado
              </div>
            ) : (
              blockedByMe.map((b) => (
                <div
                  key={b.system.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <Ban size={20} className="text-ios-red flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {b.system.name}
                    </p>
                  </div>
                  <button
                    onClick={() => unblock(b.system.id)}
                    className="text-subheadline text-ios-blue ios-press"
                  >
                    Desbloquear
                  </button>
                </div>
              ))
            )
          )}
        </GlassCard>
      </div>

      {/* Invite sheet */}
      <BottomSheet
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Convidar amigo"
      >
        <form onSubmit={sendRequest} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">E-mail do sistema</Label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="amigo@email.com"
                required
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-message">Mensagem (opcional)</Label>
            <textarea
              id="invite-message"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Oi! Quer ser meu amigo no Solara?"
              className="min-h-[80px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>

          {inviteError && (
            <p className="text-subheadline text-ios-red text-center">
              {inviteError}
            </p>
          )}

          <Button
            type="submit"
            disabled={sending || !inviteEmail.trim()}
            className="w-full"
          >
            <UsersIcon size={16} />
            {sending ? "Enviando..." : "Enviar pedido"}
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
