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
  Layers,
  UserMinus,
} from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/lib/haptics";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";

type SystemSummary = {
  id: string;
  name: string;
  accountType?: string;
  description?: string | null;
  avatarMode?: string;
  avatarEmoji?: string;
  avatarUrl?: string | null;
};

type FrontMember = { id: string; name: string; avatarUrl?: string | null; color?: string | null };

type FriendsPayload = {
  friends: (SystemSummary & {
    friendshipId: string;
    connectedAt: string;
    sharedMembers?: FrontMember[];
    currentFront?: { startedAt: string; members: FrontMember[] } | null;
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
  const { showToast } = useToast();
  const { success, selection } = useHaptics();
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
  const [removingFriend, setRemovingFriend] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

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
      success();
      void mutate(swrKeys.friends);
    } finally {
      setSending(false);
    }
  }

  async function respondRequest(id: string, action: "accept" | "decline") {
    // Accepting a friend is a happy commit; declining is a lighter tick.
    if (action === "accept") success();
    else selection();
    try {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) showToast(t("common.error"));
    } catch {
      showToast(t("common.error"));
    }
    void mutate(swrKeys.friends);
  }

  async function unblock(systemId: string) {
    selection();
    try {
      const res = await fetch(`/api/friends/blocks/${systemId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) showToast(t("common.error"));
    } catch {
      showToast(t("common.error"));
    }
    void mutate(swrKeys.friends);
  }

  function resetRemoveState() {
    setRemovingFriend(null);
    setRemoveError("");
  }

  async function removeFriend(friendSystemId: string) {
    setRemoving(true);
    setRemoveError("");
    try {
      const res = await fetch(`/api/friends/${friendSystemId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        // A firmer tick to confirm a connection was undone.
        selection();
        setRemovingFriend(null);
        void mutate(swrKeys.friends);
      } else {
        setRemoveError(t("friends.removeError"));
      }
    } catch (err) {
      console.error("Failed to remove friend", err);
      setRemoveError(t("friends.removeError"));
    } finally {
      setRemoving(false);
    }
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
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => { if (tab !== tabItem.id) selection(); setTab(tabItem.id); }}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-ios-sm text-caption-1 font-semibold ios-press whitespace-nowrap",
                tab === tabItem.id
                  ? "bg-white dark:bg-ios-gray-3/30 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {tabItem.label}
              {tabItem.count > 0 && (
                <span className="ml-1 text-ios-blue">{tabItem.count}</span>
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
              <EmptyState
                icon={UsersIcon}
                title={t("friends.noFriends")}
                description={t("friends.emptyDescription")}
                action={
                  <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
                    <UserPlus size={16} />
                    {t("friends.addFriend")}
                  </Button>
                }
              />
            ) : (
              friends.map((f) => (
                <div key={f.friendshipId} className="flex items-center border-b border-border/50 last:border-0">
                  <a
                    href={`/systems/${f.id}`}
                    className="flex-1 flex items-center gap-3 px-4 py-3 active:bg-muted/50 ios-transition min-w-0 solara-pressable"
                    style={{ ["--press-scale" as string]: "0.99" }}
                  >
                    <SystemAvatar system={f} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground truncate">
                        {f.name}
                      </p>
                      {/* Front preview */}
                      {f.currentFront && f.currentFront.members.length > 0 ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Layers size={10} className="text-ios-green flex-shrink-0" />
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {f.currentFront.members.slice(0, 3).map((m) => (
                              <div key={m.id} className="flex items-center gap-0.5 flex-shrink-0">
                                {m.avatarUrl ? (
                                  <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0">
                                    <DynamicAvatarImage src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div
                                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                    style={{ background: m.color ?? "#8E8E93" }}
                                  />
                                )}
                                <span className="text-caption-2 text-ios-green font-medium">
                                  {m.name.split(" ")[0]}
                                </span>
                              </div>
                            ))}
                            {f.currentFront.members.length > 3 && (
                              <span className="text-caption-2 text-muted-foreground">
                                +{f.currentFront.members.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : f.description ? (
                        <p className="text-caption-1 text-muted-foreground truncate">
                          {f.description}
                        </p>
                      ) : null}
                    </div>
                  </a>
                  <button
                    onClick={() => setSharingFriend({ id: f.id, name: f.name })}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center ios-press text-muted-foreground"
                    aria-label={t("sharing.title")}
                  >
                    <Shield size={15} />
                  </button>
                  <button
                    onClick={() => { setRemoveError(""); setRemovingFriend({ id: f.id, name: f.name }); }}
                    className="flex-shrink-0 ml-2 mr-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center ios-press text-ios-red"
                    aria-label={t("friends.removeFriend")}
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              ))
            )
          ) : tab === "received" ? (
            incoming.length === 0 ? (
              <EmptyState icon={Mail} title={t("friends.noReceived")} tint="var(--ios-green)" />
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
              <EmptyState icon={UserPlus} title={t("friends.noSent")} tint="var(--ios-orange)" />
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
              <EmptyState icon={Ban} title={t("friends.noBlocked")} tint="var(--ios-gray)" />
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

      {/* Remove friend confirmation sheet */}
      <BottomSheet
        open={!!removingFriend}
        onClose={() => { if (!removing) resetRemoveState(); }}
        title={t("friends.removeConfirmTitle")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-muted-foreground text-center">
            {t("friends.removeConfirmMessage", { name: removingFriend?.name ?? "" })}
          </p>
          {removeError && (
            <p className="text-subheadline text-ios-red text-center">
              {removeError}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              className="w-full"
              disabled={removing}
              onClick={() => { if (removingFriend) void removeFriend(removingFriend.id); }}
            >
              <UserMinus size={16} />
              {removing ? t("friends.removing") : t("friends.removeConfirmAction")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={removing}
              onClick={resetRemoveState}
            >
              {t("friends.cancel")}
            </Button>
          </div>
        </div>
      </BottomSheet>
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
  const { showToast } = useToast();
  const { data, isLoading } = useSWR<SharingPayload>(
    `/api/friends/sharing/${friend.id}`,
    apiFetcher
  );
  const [saving, setSaving] = useState(false);

  const activeMembers = (data?.members ?? []).filter((m) => !m.isArchived);
  const currentVisibility: "hidden" | "profile" | "full" = (() => {
    if (activeMembers.length === 0) return "hidden";
    const visibilities = new Set(activeMembers.map((m) => m.visibility));
    if (visibilities.size === 1) return activeMembers[0].visibility;
    return "hidden";
  })();

  async function setGlobalVisibility(visibility: "hidden" | "profile" | "full") {
    setSaving(true);
    try {
      const res = await fetch(`/api/friends/sharing/${friend.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        showToast(t("common.saveError"));
        return;
      }
      void mutate(`/api/friends/sharing/${friend.id}`);
      void mutate(swrKeys.friends);
      onClose();
    } catch {
      showToast(t("common.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const options: { value: "hidden" | "profile" | "full"; label: string; desc: string; icon: React.ReactNode; activeColor: string }[] = [
    { value: "hidden", label: t("sharing.hidden"), desc: t("sharing.hiddenDesc"), icon: <EyeOff size={20} />, activeColor: "border-muted-foreground bg-muted/40" },
    { value: "profile", label: t("sharing.profile"), desc: t("sharing.profileDesc"), icon: <Eye size={20} />, activeColor: "border-ios-green bg-ios-green/10" },
    { value: "full", label: t("sharing.full"), desc: t("sharing.fullDesc"), icon: <Eye size={20} />, activeColor: "border-ios-blue bg-ios-blue/10" },
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

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-ios-lg" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {options.map((opt) => {
              const isActive = currentVisibility === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setGlobalVisibility(opt.value)}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-ios-lg border ios-transition ios-press text-left disabled:opacity-50",
                    isActive ? opt.activeColor : "border-border/50 bg-secondary/50"
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0",
                    isActive
                      ? opt.value === "hidden" ? "text-foreground" : opt.value === "profile" ? "text-ios-green" : "text-ios-blue"
                      : "text-muted-foreground"
                  )}>
                    {opt.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-body font-semibold",
                      isActive
                        ? opt.value === "hidden" ? "text-foreground" : opt.value === "profile" ? "text-ios-green" : "text-ios-blue"
                        : "text-foreground"
                    )}>
                      {opt.label}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">{opt.desc}</p>
                  </div>
                  {isActive && (
                    <Check size={18} className={cn(
                      "flex-shrink-0",
                      opt.value === "hidden" ? "text-foreground" : opt.value === "profile" ? "text-ios-green" : "text-ios-blue"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
