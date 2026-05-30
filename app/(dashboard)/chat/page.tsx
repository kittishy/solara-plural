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
  Smile,
  Search,
  X,
  ImageUp,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { LargeTitle } from "@/components/layout/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
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

  const { data: channelsData, isLoading: loadingChannels, error: channelsError } = useSWR<{ channels: Channel[] }>(
    "/api/chat/channels",
    apiFetcher
  );
  const { data: membersData } = useSWR<{ data: Member[] }>("/api/members?limit=9999", apiFetcher);
  const membersList = membersData?.data ?? [];

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
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const chatUnavailableMessage = channelsError instanceof Error ? channelsError.message : "";

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

  function insertAtCursor(text: string) {
    const input = inputRef.current;
    if (!input) {
      setMessageText((prev) => prev + text);
      return;
    }
    const start = input.selectionStart ?? messageText.length;
    const end = input.selectionEnd ?? messageText.length;
    const next = messageText.slice(0, start) + text + messageText.slice(end);
    setMessageText(next);
    requestAnimationFrame(() => {
      const pos = start + text.length;
      input.setSelectionRange(pos, pos);
      input.focus();
    });
  }

  async function handleFileUpload(file: File) {
    setUploadError("");
    if (file.size > 20 * 1024 * 1024) {
      setUploadError(t("chat.fileTooBig"));
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setUploadError(json?.error ?? t("chat.uploadFailed"));
        return;
      }
      const isImage = file.type.startsWith("image/");
      insertAtCursor(isImage ? `![image](${json.url})` : json.url);
    } catch {
      setUploadError(t("chat.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  const activeMember = (membersList ?? []).find((m) => m.id === selectedMemberId);

  return (
    /* Fixed container that fills the dynamic viewport minus the tab bar.
       top/bottom anchored with safe-area so it works in PWA Chrome and
       Android WebView (which often reports env() as 0). */
    <div
      className="fixed inset-x-0 flex flex-col animate-fade-in bg-[var(--ios-bg)]"
      style={{
        top: "0px",
        bottom: "calc(max(env(safe-area-inset-bottom, 0px), 12px) + 80px)",
        height: "auto",
      }}
    >
      {/* Header */}
      <div className="shrink-0 glass border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-12 pt-[var(--safe-top)]">
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
            aria-label={t("chat.newChannel")}
          >
            <Plus size={20} className="text-ios-blue" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {chatUnavailableMessage ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 pb-8 text-center text-muted-foreground">
            <AlertTriangle size={40} className="text-ios-red/60" />
            <div>
              <p className="text-body font-semibold text-foreground">
                {t("chat.unavailable")}
              </p>
              <p className="text-subheadline mt-0.5">
                {chatUnavailableMessage}
              </p>
            </div>
          </div>
        ) : loadingMessages ? (
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
                      <div className="text-body text-foreground whitespace-pre-wrap break-words leading-snug prose-img:rounded-ios-md prose-img:max-w-full prose-img:max-h-80 prose-img:object-cover prose-a:text-ios-blue prose-a:underline">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
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

      {/* Upload error */}
      {uploadError && (
        <div className="shrink-0 px-4 py-1.5 bg-ios-red/10 border-t border-ios-red/20 flex items-center justify-between gap-2">
          <p className="text-caption-1 text-ios-red flex-1">{uploadError}</p>
          <button type="button" onClick={() => setUploadError("")} className="text-ios-red ios-press flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input bar — Telegram style */}
      {!chatUnavailableMessage && activeChannelId && (
        <div className="shrink-0 border-t border-border/40 glass px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
          <form onSubmit={sendMessage} className="flex items-center gap-2 relative">
            {/* Member avatar — tap to open picker */}
            <button
              type="button"
              onClick={() => setShowMemberPicker(true)}
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ios-press border-2 border-border/40"
              style={{ background: activeMember?.color ? `${activeMember.color}22` : "#8E8E9322" }}
            >
              {activeMember?.avatarUrl ? (
                <DynamicAvatarImage
                  src={activeMember.avatarUrl}
                  alt={activeMember.name}
                  className="w-full h-full object-cover"
                />
              ) : activeMember ? (
                <span
                  className="text-caption-1 font-bold"
                  style={{ color: activeMember.color ?? "#8E8E93" }}
                >
                  {activeMember.name[0].toUpperCase()}
                </span>
              ) : (
                <span className="text-base">☀️</span>
              )}
            </button>

            {/* Input pill */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5 h-10 px-3 rounded-full bg-secondary">
              <button
                type="button"
                onClick={() => { setShowEmojiPicker((v) => !v); }}
                className="flex items-center justify-center flex-shrink-0 ios-press"
                aria-label={t("chat.emojiPicker")}
              >
                <Smile size={18} className="text-muted-foreground" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t("chat.messagePlaceholderAs", { name: activeMember?.name ?? t("chat.system") })}
                maxLength={2000}
                className="flex-1 bg-transparent text-body focus:outline-none min-w-0"
              />
              <label
                className="flex items-center justify-center flex-shrink-0 ios-press disabled:opacity-40 cursor-pointer"
                aria-label={t("chat.attachFile")}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.gif,.pdf,.doc,.docx,.txt,.zip,.mp3,.wav"
                  className="hidden"
                  tabIndex={-1}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { handleFileUpload(file); }
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <Loader2 size={18} className="text-muted-foreground animate-spin" />
                ) : (
                  <ImageUp size={18} className="text-muted-foreground" />
                )}
              </label>
            </div>

            {/* Send button — only when there's text */}
            {messageText.trim() && (
              <button
                type="submit"
                disabled={sending}
                className="w-9 h-9 rounded-full bg-ios-blue text-white flex items-center justify-center ios-press disabled:opacity-40 flex-shrink-0"
                aria-label={t("common.send")}
              >
                <Send size={16} />
              </button>
            )}

            {/* Emoji picker panel */}
            <EmojiPicker
              open={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onSelect={(emoji) => {
                insertAtCursor(emoji);
                inputRef.current?.focus();
              }}
            />
          </form>
        </div>
      )}

      {/* Member picker — "Send as..." */}
      <BottomSheet
        open={showMemberPicker}
        onClose={() => { setShowMemberPicker(false); setMemberSearch(""); }}
        title={t("chat.sendAs")}
      >
        {/* Search input */}
        <div className="relative mx-3 mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder={t("chat.searchAlter")}
            className="w-full h-9 pl-9 pr-8 rounded-ios-md bg-secondary text-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          {memberSearch && (
            <button
              type="button"
              onClick={() => setMemberSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground ios-press"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          {/* System option */}
          <button
            type="button"
            onClick={() => { setSelectedMemberId(null); setShowMemberPicker(false); setMemberSearch(""); }}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-ios-lg ios-press ios-transition",
              !selectedMemberId ? "bg-ios-blue/10" : "hover:bg-secondary"
            )}
          >
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xl">
              ☀️
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className={cn("text-body font-semibold", !selectedMemberId ? "text-ios-blue" : "text-foreground")}>
                {t("chat.system")}
              </p>
              <p className="text-caption-1 text-muted-foreground">{t("chat.systemAccount")}</p>
            </div>
            {!selectedMemberId && (
              <div className="w-5 h-5 rounded-full bg-ios-blue flex items-center justify-center flex-shrink-0">
                <Send size={10} className="text-white" />
              </div>
            )}
          </button>

          {/* Members */}
          {(membersList ?? [])
            .filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
            .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setSelectedMemberId(m.id); setShowMemberPicker(false); setMemberSearch(""); }}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-ios-lg ios-press ios-transition",
                selectedMemberId === m.id ? "bg-ios-blue/10" : "hover:bg-secondary"
              )}
            >
              <div
                className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: m.color ? `${m.color}22` : "#8E8E9322" }}
              >
                {m.avatarUrl ? (
                  <DynamicAvatarImage src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-subheadline font-bold" style={{ color: m.color ?? "#8E8E93" }}>
                    {m.name[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={cn("text-body font-semibold truncate", selectedMemberId === m.id ? "text-ios-blue" : "text-foreground")}>
                  {m.name}
                </p>
              </div>
              {selectedMemberId === m.id && (
                <div className="w-5 h-5 rounded-full bg-ios-blue flex items-center justify-center flex-shrink-0">
                  <Send size={10} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

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
                    aria-label={t("chat.deleteChannel")}
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
