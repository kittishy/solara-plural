"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { Heart, Mail, Check, X } from "lucide-react";
import Link from "next/link";
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

type PartnerSystem = {
  id: string;
  name: string;
  accountType?: string;
  description?: string | null;
  avatarMode?: string;
  avatarEmoji?: string;
  avatarUrl?: string | null;
};

type PartnersPayload = {
  partners: {
    partnershipId: string;
    id: string;
    name: string;
    accountType?: string;
    description?: string | null;
    avatarMode?: string;
    avatarEmoji?: string;
    avatarUrl?: string | null;
    relationshipLabel?: string | null;
    partneredSince?: string | null;
  }[];
  incomingRequests: {
    requestId: string;
    from: PartnerSystem;
    message?: string | null;
    createdAt: string;
  }[];
  outgoingRequests: {
    requestId: string;
    to: PartnerSystem;
    message?: string | null;
    createdAt: string;
  }[];
};

function SystemAvatar({ system, size = 44 }: { system: PartnerSystem; size?: number }) {
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
      className="rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {system.avatarEmoji || "☀️"}
    </div>
  );
}

export default function PartnersPage() {
  const { t } = useLanguage();
  const { success, selection } = useHaptics();
  const { data, isLoading } = useSWR<PartnersPayload>(
    swrKeys.partners,
    apiFetcher
  );

  const [tab, setTab] = useState<"current" | "received" | "sent">("current");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/partners", {
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
        setError(json.error ?? t("partners.sendError"));
        return;
      }
      setInviteEmail("");
      setInviteMessage("");
      setShowInvite(false);
      success();
      void mutate(swrKeys.partners);
    } finally {
      setSending(false);
    }
  }

  async function respondRequest(id: string, action: "accept" | "decline") {
    if (action === "accept") success();
    else selection();
    await fetch(`/api/partners/requests/${id}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    void mutate(swrKeys.partners);
  }

  const partners = data?.partners ?? [];
  const incoming = data?.incomingRequests ?? [];
  const outgoing = data?.outgoingRequests ?? [];

  const tabs = [
    { id: "current", label: t("partners.current"), count: partners.length },
    { id: "received", label: t("partners.received"), count: incoming.length },
    { id: "sent", label: t("partners.sent"), count: outgoing.length },
  ] as const;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("partners.title")}</LargeTitle>
        <Button size="icon" className="mb-1" onClick={() => setShowInvite(true)}>
          <Heart size={20} />
        </Button>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-ios-md bg-secondary">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => { if (tab !== tabItem.id) selection(); setTab(tabItem.id); }}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-ios-sm text-caption-1 font-semibold ios-press",
                tab === tabItem.id
                  ? "bg-white dark:bg-ios-gray-3/30 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {tabItem.label}
              {tabItem.count > 0 && (
                <span className="ml-1 text-ios-pink">{tabItem.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-11 h-11 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : tab === "current" ? (
            partners.length === 0 ? (
              <EmptyState
                icon={Heart}
                title={t("partners.noPartners")}
                description={t("partners.emptyDescription")}
                tint="var(--ios-pink)"
                action={
                  <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
                    <Heart size={16} />
                    {t("partners.sendRequest")}
                  </Button>
                }
              />
            ) : (
              partners.map((p) => (
                <Link
                  key={p.partnershipId}
                  href={`/partners/${p.partnershipId}`}
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition solara-pressable"
                  style={{ ["--press-scale" as string]: "0.99" }}
                >
                  <SystemAvatar system={p} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {p.name}
                    </p>
                    {p.relationshipLabel && (
                      <p className="text-caption-1 text-ios-pink">
                        {p.relationshipLabel}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )
          ) : tab === "received" ? (
            incoming.length === 0 ? (
              <EmptyState icon={Mail} title={t("partners.noReceived")} tint="var(--ios-pink)" />
            ) : (
              incoming.map((r) => (
                <div
                  key={r.requestId}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <SystemAvatar system={r.from} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {r.from.name}
                    </p>
                    {r.message && (
                      <p className="text-caption-1 text-muted-foreground truncate">
                        &ldquo;{r.message}&rdquo;
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => respondRequest(r.requestId, "decline")}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center ios-press"
                    aria-label={t("partners.reject")}
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => respondRequest(r.requestId, "accept")}
                    className="w-9 h-9 rounded-full bg-ios-pink text-white flex items-center justify-center ios-press"
                    aria-label={t("partners.accept")}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              ))
            )
          ) : (
            outgoing.length === 0 ? (
              <EmptyState icon={Heart} title={t("partners.noSent")} tint="var(--ios-orange)" />
            ) : (
              outgoing.map((r) => (
                <div
                  key={r.requestId}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <SystemAvatar system={r.to} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {r.to.name}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">
                      {t("partners.waitingReply")}
                    </p>
                  </div>
                  <button
                    onClick={() => respondRequest(r.requestId, "decline")}
                    className="text-subheadline text-ios-red ios-press"
                  >
                    {t("partners.cancel")}
                  </button>
                </div>
              ))
            )
          )}
        </GlassCard>
      </div>

      <BottomSheet
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title={t("partners.requestTitle")}
      >
        <form onSubmit={sendRequest} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-email">{t("partners.emailLabel")}</Label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                id="partner-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t("partners.emailPlaceholder")}
                required
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-message">{t("partners.messageLabel")}</Label>
            <textarea
              id="partner-message"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows={3}
              maxLength={500}
              className="min-h-[80px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>

          {error && (
            <p className="text-subheadline text-ios-red text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={sending || !inviteEmail.trim()}
            className="w-full"
          >
            <Heart size={16} />
            {sending ? t("partners.sending") : t("partners.sendRequest")}
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
