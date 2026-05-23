"use client";

import useSWR, { mutate } from "swr";
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Plus,
  Send,
  Hash,
  X,
  Menu,
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

type Channel = {
  id: string;
  name: string;
  sortOrder?: number;
};

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

type Member = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
};

function formatTime(value: string | number | Date) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const { data: channelsData, isLoading: loadingChannels } = useSWR<{
    channels: Channel[];
  }>("/api/chat/channels", apiFetcher);

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const { data: messagesData, isLoading: loadingMessages } = useSWR<{
    messages: Message[];
  }>(
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

  const activeMember = (membersList ?? []).find(
    (m) => m.id === selectedMemberId
  );

  return (
    <div className="animate-fade-in flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="sticky top-0 z-30 glass border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-12">
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-1 ios-press"
          >
            <Menu size={20} className="text-ios-blue" />
          </button>
          <h1 className="text-headline font-semibold text-foreground flex items-center gap-1.5">
            <Hash size={14} />
            {activeChannel?.name ?? "Chat"}
          </h1>
          <button
            type="button"
            onClick={() => setShowNewChannel(true)}
            className="ios-press"
          >
            <Plus size={20} className="text-ios-blue" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loadingMessages ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle size={36} className="text-muted-foreground/40 mb-2" />
            <p className="text-subheadline">Sem mensagens ainda</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 px-2">
                <div
                  className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{
                    background: msg.memberColor
                      ? `${msg.memberColor}22`
                      : "#8E8E9322",
                  }}
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
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-subheadline font-semibold"
                      style={{ color: msg.memberColor ?? undefined }}
                    >
                      {msg.memberName ?? "Sistema"}
                    </span>
                    <span className="text-caption-2 text-muted-foreground">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-body text-foreground whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {activeChannelId && (
        <div className="border-t border-border/40 glass px-3 py-2 safe-bottom">
          {/* Member picker */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedMemberId(null)}
              className={cn(
                "px-3 py-1 rounded-full text-caption-1 font-semibold whitespace-nowrap ios-press",
                !selectedMemberId
                  ? "bg-ios-blue text-white"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              Sistema
            </button>
            {(membersList ?? []).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMemberId(m.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-caption-1 font-semibold whitespace-nowrap ios-press"
                )}
                style={{
                  background:
                    selectedMemberId === m.id
                      ? m.color ?? "#007AFF"
                      : m.color
                        ? `${m.color}22`
                        : "#E5E5EA",
                  color:
                    selectedMemberId === m.id
                      ? "white"
                      : m.color ?? "#000000",
                }}
              >
                {m.name}
              </button>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Mensagem como ${activeMember?.name ?? "sistema"}...`}
              maxLength={4000}
              className="flex-1 h-10 px-4 rounded-full bg-secondary text-body focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="w-10 h-10 rounded-full bg-ios-blue text-white flex items-center justify-center ios-press disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Sidebar (channels) */}
      <BottomSheet
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        title="Canais"
      >
        <div className="flex flex-col gap-1">
          {loadingChannels ? (
            <Skeleton className="h-10 w-full" />
          ) : channels.length === 0 ? (
            <p className="text-center text-muted-foreground text-subheadline py-4">
              Nenhum canal — crie um
            </p>
          ) : (
            channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  setActiveChannelId(ch.id);
                  setShowSidebar(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-ios-sm text-left ios-press",
                  activeChannelId === ch.id
                    ? "bg-ios-blue/15 text-ios-blue"
                    : "text-foreground active:bg-muted"
                )}
              >
                <Hash size={16} />
                <span className="text-body font-medium">{ch.name}</span>
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      {/* New channel */}
      <BottomSheet
        open={showNewChannel}
        onClose={() => setShowNewChannel(false)}
        title="Novo canal"
      >
        <form onSubmit={createChannel} className="flex flex-col gap-4">
          <Input
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="Nome do canal"
            maxLength={50}
            autoFocus
          />
          <Button
            type="submit"
            disabled={creating || !newChannelName.trim()}
            className="w-full"
          >
            {creating ? "Criando..." : "Criar canal"}
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
