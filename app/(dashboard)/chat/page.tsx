"use client";

import useSWR, { mutate } from "swr";
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Plus,
  Send,
  Hash,
  Menu,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Channel = { id: string; name: string; sortOrder?: number };
type Message = {
  id: string;
  content: string;
  createdAt: string | number | Date;
  memberId: string | null;
  channelId: string;
  memberName: string | null;
  memberColor: string | null;
  memberAvatarUrl: string | null;
};
type Member = { id: string; name: string; color: string | null; avatarUrl: string | null };

function shouldShowTimeSeparator(prev: Message, curr: Message) {
  const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap > 30 * 60 * 1000; // 30 minutes
}

function shouldShowDateSeparator(prev: Message | null, curr: Message) {
  if (!prev) return true;
  return new Date(prev.createdAt).toDateString() !== new Date(curr.createdAt).toDateString();
}

export default function ChatPage() {
  const { t, language } = useLanguage();

  function formatTime(value: string | number | Date) {
    return new Date(value).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateLabel(value: string | number | Date) {
    const d = new Date(value);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t("chat.today");
    if (d.toDateString() === yesterday.toDateString()) return t("chat.yesterday");
    return d.toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" });
  }

  const { data: channelsData, isLoading: loadingChannels } = useSWR<{ channels: Channel[] }>(
    "/api/chat/channels",
    apiFetcher
  );
  const { data: membersList } = useSWR<Member[]>(swrKeys.members, apiFetcher);

  const channels = channelsData?.channels ?? [];
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [creating, setCreating] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState<Channel | null>(null);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels.length, activeChannelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: messagesData, isLoading: loadingMessages } = useSWR<{ messages: Message[] }>(
    activeChannelId ? `/api/chat?channelId=${activeChannelId}` : null,
    apiFetcher,
    { refreshInterval: 5000 }
  );

  const messages = messagesData?.messages ?? [];
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNewChannelName("");
        setShowNewChannel(false);
        void mutate("/api/chat/channels");
        setActiveChannelId(json.data.channel.id);
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteChannel(channel: Channel) {
    setDeletingChannelId(channel.id);
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        void mutate("/api/chat/channels");
        if (activeChannelId === channel.id) {
          const remaining = channels.filter((c) => c.id !== channel.id);
          setActiveChannelId(remaining[0]?.id ?? null);
        }
      }
    } finally {
      setDeletingChannelId(null);
      setConfirmDeleteChannel(null);
    }
  }

  async function deleteMessage(msgId: string) {
    setDeletingMsgId(msgId);
    try {
      await fetch(`/api/chat/${msgId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      void mutate(`/api/chat?channelId=${activeChannelId}`);
    } finally {
      setDeletingMsgId(null);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !activeChannelId) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChannelId,
          content: messageText.trim(),
          memberId: selectedMemberId,
        }),
      });
      if (res.ok) {
        setMessageText("");
        void mutate(`/api/chat?channelId=${activeChannelId}`);
      }
    } finally {
      setSending(false);
    }
  }

  const activeMember = (membersList ?? []).find((m) => m.id === selectedMemberId);

  return (
    /* Fixed container that fills viewport minus the tab bar (~80px from bottom) */
    <div
      className="fixed inset-x-0 top-0 flex flex-col animate-fade-in bg-[var(--ios-bg)]"
      style={{ bottom: "80px" }}
    >
      {/* Header */}
      <div className="shrink-0 glass border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-12 pt-[env(safe-area-inset-top,0px)]">
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-1.5 text-ios-blue ios-press"
            aria-label={t("chat.channels")}
          >
            <Menu size={20} />
            <span className="text-body font-medium">{t("chat.channels")}</span>
          </button>
          <h1 className="text-headline font-semibold text-foreground flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
            <Hash size={14} className="text-muted-foreground" />
            {activeChannel?.name ?? "Chat"}
          </h1>
          <button
            type="button"
            onClick={() => setShowNewChannel(true)}
            className="ios-press"
            aria-label="Novo canal"
          >
            <Plus size={20} className="text-ios-blue" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loadingMessages ? (
          <div className="flex flex-col gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-8 text-muted-foreground">
            <MessageCircle size={40} className="text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-body font-semibold">{t("chat.emptyTitle")}</p>
              <p className="text-subheadline mt-0.5">{t("chat.emptySubtitle")}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const showDate = shouldShowDateSeparator(prev, msg);
              const showTimeSep = !showDate && prev != null && shouldShowTimeSeparator(prev, msg);

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-caption-1 text-muted-foreground font-semibold px-1">
                        {formatDateLabel(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  )}

                  {/* Time gap separator */}
                  {showTimeSep && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-caption-2 text-muted-foreground/60 bg-muted/40 px-2.5 py-0.5 rounded-full">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Message row */}
                  <div className="group flex gap-3 px-1 py-1.5 rounded-ios-sm active:bg-muted/30 ios-transition">
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: msg.memberColor ? `${msg.memberColor}22` : "#8E8E9322" }}
                    >
                      {msg.memberAvatarUrl ? (
                        <DynamicAvatarImage
                          src={msg.memberAvatarUrl}
                          alt={msg.memberName ?? "?"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-caption-1 font-semibold"
                          style={{ color: msg.memberColor ?? "#8E8E93" }}
                        >
                          {(msg.memberName ?? "?")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span
                          className="text-subheadline font-semibold"
                          style={{ color: msg.memberColor ?? undefined }}
                        >
                          {msg.memberName ?? t("chat.system")}
                        </span>
                        <span className="text-caption-2 text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-body text-foreground whitespace-pre-wrap break-words leading-snug">
                        {msg.content}
                      </p>
                    </div>
                    {/* Delete button — visible on hover/focus */}
                    <button
                      type="button"
                      onClick={() => deleteMessage(msg.id)}
                      disabled={deletingMsgId === msg.id}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-full bg-ios-red/10 text-ios-red flex items-center justify-center flex-shrink-0 ios-press disabled:opacity-30 transition-opacity mt-0.5"
                      aria-label={t("chat.deleteMessage")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      {activeChannelId && (
        <div className="shrink-0 border-t border-border/40 glass px-3 pt-2 pb-3">
          {/* Member selector chips */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedMemberId(null)}
              className={cn(
                "px-3 py-1 rounded-full text-caption-1 font-semibold whitespace-nowrap ios-press flex-shrink-0",
                !selectedMemberId ? "bg-ios-blue text-white" : "bg-secondary text-muted-foreground"
              )}
            >
              {t("chat.system")}
            </button>
            {(membersList ?? []).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMemberId(m.id)}
                className="px-3 py-1 rounded-full text-caption-1 font-semibold whitespace-nowrap ios-press flex-shrink-0"
                style={{
                  background: selectedMemberId === m.id ? (m.color ?? "#007AFF") : (m.color ? `${m.color}22` : "#E5E5EA"),
                  color: selectedMemberId === m.id ? "white" : (m.color ?? "#000000"),
                }}
              >
                {m.name}
              </button>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 items-center">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t("chat.messagePlaceholderAs", { name: activeMember?.name ?? t("chat.system") })}
              maxLength={4000}
              className="flex-1 h-10 px-4 rounded-full bg-secondary text-body focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="w-10 h-10 rounded-full bg-ios-blue text-white flex items-center justify-center ios-press disabled:opacity-40 flex-shrink-0"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Channels sidebar sheet */}
      <BottomSheet open={showSidebar} onClose={() => setShowSidebar(false)} title={t("chat.channels")}>
        <div className="flex flex-col gap-1">
          {loadingChannels ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : channels.length === 0 ? (
            <p className="text-center text-muted-foreground text-subheadline py-4">
              {t("chat.noChannels")}
            </p>
          ) : (
            channels.map((ch) => (
              <div
                key={ch.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-ios-sm",
                  activeChannelId === ch.id ? "bg-ios-blue/15" : ""
                )}
              >
                <button
                  onClick={() => { setActiveChannelId(ch.id); setShowSidebar(false); }}
                  className={cn(
                    "flex-1 flex items-center gap-2 text-left ios-press",
                    activeChannelId === ch.id ? "text-ios-blue" : "text-foreground"
                  )}
                >
                  <Hash size={16} />
                  <span className="text-body font-medium">{ch.name}</span>
                </button>
                {channels.length > 1 && (
                  <button
                    onClick={() => setConfirmDeleteChannel(ch)}
                    disabled={deletingChannelId === ch.id}
                    className="w-8 h-8 rounded-full bg-ios-red/10 text-ios-red flex items-center justify-center ios-press disabled:opacity-40"
                    aria-label={`Excluir ${ch.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
          <div className="mt-2 pt-2 border-t border-border/50">
            <button
              onClick={() => { setShowSidebar(false); setShowNewChannel(true); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-ios-sm text-ios-blue ios-press"
            >
              <Plus size={16} />
              <span className="text-body font-medium">{t("chat.newChannel")}</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* New channel sheet */}
      <BottomSheet open={showNewChannel} onClose={() => setShowNewChannel(false)} title={t("chat.newChannel")}>
        <form onSubmit={createChannel} className="flex flex-col gap-4">
          <Input
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder={t("chat.channelName")}
            maxLength={50}
            autoFocus
          />
          <Button type="submit" disabled={creating || !newChannelName.trim()} className="w-full">
            {creating ? t("chat.creating") : t("chat.createChannel")}
          </Button>
        </form>
      </BottomSheet>

      {/* Confirm delete channel sheet */}
      <BottomSheet
        open={confirmDeleteChannel !== null}
        onClose={() => setConfirmDeleteChannel(null)}
        title={t("chat.confirmDeleteTitle")}
      >
        {confirmDeleteChannel && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 rounded-ios-lg bg-ios-red/5 border border-ios-red/15">
              <AlertTriangle size={20} className="text-ios-red flex-shrink-0 mt-0.5" />
              <p className="text-body text-foreground">
                {t("chat.confirmDeleteChannel", { name: confirmDeleteChannel.name })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="destructive"
                onClick={() => deleteChannel(confirmDeleteChannel)}
                disabled={deletingChannelId === confirmDeleteChannel.id}
                className="w-full"
              >
                {deletingChannelId === confirmDeleteChannel.id ? t("chat.deleting") : t("chat.confirmDeleteBtn")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDeleteChannel(null)} className="w-full">
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
