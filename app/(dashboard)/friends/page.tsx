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
  Shield,
  Eye,
  EyeOff,
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
import { useLanguage } from "@/components/providers/LanguageProvider";

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
  const { t } = useLanguage();
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
  const [sharingFriend, setSharingFriend] = useState<{ id: string; name: string } | null>(null);

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
        setInviteError(json.error ?? t("friends.sendError"));
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
    { id: "friends", label: t("friends.friends"), count: friends.length },
    { id: "received", label: t("friends.received"), count: incoming.length },
    { id: "sent", label: t("friends.sent"), count: outgoing.length },
    { id: "blocked", label: t("friends.blocked"), count: blockedByMe.length },
  ] as const;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("friends.title")}</LargeTitle>
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
                {t("friends.noFriends")}
              </div>
            ) : (
              friends.map((f) => (
                <div key={f.friendshipId} className="flex items-center border-b border-border/50 last:border-0">
                  <a
                    href={`/systems/${f.id}`}
                    className="flex-1 flex items-center gap-3 px-4 py-3 active:bg-muted/50 ios-transition min-w-0"
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
                  <button
                    onClick={() => setSharingFriend({ id: f.id, name: f.name })}
                    className="flex-shrink-0 mr-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center ios-press text-muted-foreground"
                    aria-label={t("sharing.title")}
                  >
                    <Shield size={15} />
                  </button>
                </div>
              ))
            )
          ) : tab === "received" ? (
            incoming.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-subheadline">
                {t("friends.noReceived")}
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
                    aria-label={t("friends.reject")}
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => respondRequest(r.friendshipId, "accept")}
                    className="w-9 h-9 rounded-full bg-ios-blue text-white flex items-center justify-center ios-press"
                    aria-label={t("friends.accept")}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              ))
            )
          ) : tab === "sent" ? (
            outgoing.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-subheadline">
                {t("friends.noSent")}
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
                      {t("friends.waitingReply")}
                    </p>
                  </div>
                  <button
                    onClick={() => respondRequest(r.friendshipId, "decline")}
                    className="text-subheadline text-ios-red ios-press"
                  >
                    {t("friends.cancel")}
                  </button>
                </div>
              ))
            )
          ) : (
            blockedByMe.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-subheadline">
                {t("friends.noBlocked")}
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
                    {t("friends.unblock")}
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
        title={t("friends.inviteTitle")}
      >
        <form onSubmit={sendRequest} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">{t("friends.emailLabel")}</Label>
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
                placeholder={t("friends.emailPlaceholder")}
                required
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-message">{t("friends.messageLabel")}</Label>
            <textarea
              id="invite-message"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("friends.messagePlaceholder")}
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
            {sending ? t("friends.sending") : t("friends.sendRequest")}
          </Button>
        </form>
      </BottomSheet>

      {/* Per-friend sharing settings sheet */}
      {sharingFriend && (
        <SharingSheet
          friend={sharingFriend}
          onClose={() => setSharingFriend(null)}
        />
      )}
    </div>
  );
}

// ─── Sharing settings sheet ───────────────────────────────────────────────────

type SharingMember = {
  id: string;
  name: string;
  isArchived: boolean;
  visibility: "hidden" | "profile" | "full";
};

type SharingPayload = {
  friend: { id: string; name: string };
  members: SharingMember[];
};

function SharingSheet({
  friend,
  onClose,
}: {
  friend: { id: string; name: string };
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { data, isLoading } = useSWR<SharingPayload>(
    `/api/friends/sharing/${friend.id}`,
    apiFetcher
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function setVisibility(memberId: string, visibility: "hidden" | "profile" | "full") {
    setSaving(memberId);
    try {
      await fetch(`/api/friends/sharing/${friend.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, visibility }),
      });
      void mutate(`/api/friends/sharing/${friend.id}`);
    } finally {
      setSaving(null);
    }
  }

  const activeMembers = (data?.members ?? []).filter((m) => !m.isArchived);

  const visibilityOptions: { value: SharingMember["visibility"]; label: string; icon: React.ReactNode }[] = [
    { value: "hidden", label: t("sharing.hidden"), icon: <EyeOff size={14} /> },
    { value: "profile", label: t("sharing.profile"), icon: <Eye size={14} /> },
    { value: "full", label: t("sharing.full"), icon: <Eye size={14} className="text-ios-blue" /> },
  ];

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={t("sharing.title")}
    >
      <div className="flex flex-col gap-3">
        <p className="text-caption-1 text-muted-foreground text-center -mt-1">
          {t("sharing.subtitle", { name: friend.name })}
        </p>

        <div className="rounded-ios-lg overflow-hidden border border-border/50">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-7 w-48 rounded-full" />
                </div>
              ))}
            </div>
          ) : activeMembers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-subheadline">
              {t("members.noMembers")}
            </p>
          ) : (
            activeMembers.map((m, idx) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  idx < activeMembers.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-caption-1 font-semibold text-muted-foreground">
                    {m.name[0].toUpperCase()}
                  </span>
                </div>
                <p className="flex-1 text-body font-medium text-foreground truncate min-w-0">
                  {m.name}
                </p>
                {/* Segmented visibility control */}
                <div className="flex rounded-full border border-border/60 overflow-hidden flex-shrink-0">
                  {visibilityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(m.id, opt.value)}
                      disabled={saving === m.id}
                      className={cn(
                        "px-2.5 py-1 text-caption-2 font-semibold flex items-center gap-1 ios-transition disabled:opacity-50",
                        m.visibility === opt.value
                          ? opt.value === "hidden"
                            ? "bg-muted text-foreground"
                            : opt.value === "full"
                              ? "bg-ios-blue text-white"
                              : "bg-ios-green/80 text-white"
                          : "text-muted-foreground bg-transparent"
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
