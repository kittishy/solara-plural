'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SCANLINE_BG } from '@/lib/styles';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ensureAccentReadable } from '@/lib/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type Channel = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  memberId: string | null;
  channelId: string | null;
  memberName: string | null;
  memberColor: string | null;
  memberAvatarUrl: string | null;
};

type MemberOption = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
};

type ApiSuccess<T> = { success: true; data: T };

// ─── Constants ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;
const GAP_THRESHOLD_MS = 30 * 60 * 1_000;
const SCROLL_STICKY_THRESHOLD = 80;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseIso(value: string): Date {
  return new Date(value);
}

function formatTime(value: string, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatSeparatorDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getContrastColor(hex: string | null): string {
  if (!hex) return 'var(--theme-muted)';
  const clean = hex.replace('#', '');
  if (clean.length < 6) return 'var(--theme-muted)';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1426' : '#f4ecff';
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  const json = (await res.json()) as ApiSuccess<T> | { success: false; error?: string };
  if (!res.ok || !json.success) {
    throw new Error((!json.success && json.error) ? json.error : 'Request failed');
  }
  return (json as ApiSuccess<T>).data;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconHash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconMenu({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function IconSend({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22 11 13 2 9l20-7z" />
    </svg>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function MemberAvatar({
  name,
  color,
  avatarUrl,
  size = 40,
}: {
  name: string;
  color: string | null;
  avatarUrl: string | null;
  size?: number;
}) {
  const dim = `${size}px`;
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} width={size} height={size}
        style={{ width: dim, height: dim, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  const bg = color ?? 'rgba(255,255,255,0.08)';
  const textColor = color ? getContrastColor(color) : 'var(--theme-muted)';
  return (
    <span aria-hidden="true"
      style={{
        width: dim, height: dim, borderRadius: '50%',
        background: bg, color: textColor,
        fontSize: size <= 22 ? '8px' : size <= 30 ? '10px' : size <= 36 ? '11px' : '13px',
        fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, letterSpacing: '0.04em', fontFamily: 'inherit',
      }}
    >
      {getInitials(name)}
    </span>
  );
}

// ─── Channel Sidebar ─────────────────────────────────────────────────────────

function ChannelsSidebar({
  channels,
  activeChannelId,
  onSelect,
  onCreate,
  onDelete,
  isOpen,
  onClose,
  systemName,
  labels,
}: {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  systemName: string;
  labels: {
    channels: string;
    addChannel: string;
    newChannel: string;
    channelName: string;
    channelNameHint: string;
    create: string;
    cancel: string;
    deleteChannel: string;
    closeChannels: string;
  };
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) setTimeout(() => createInputRef.current?.focus(), 20);
  }, [creating]);

  const startCreate = () => {
    setNewName('');
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewName('');
  };

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    try {
      await onCreate(name);
      cancelCreate();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label={labels.closeChannels}
          onClick={onClose}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] animate-fade-in"
        />
      )}

      <aside
        className={`
          shrink-0 w-64 md:w-56 lg:w-60 flex flex-col border-r-2 border-border-strong
          md:relative md:translate-x-0 md:flex
          fixed top-0 bottom-0 left-0 z-40
          transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'var(--theme-surface)',
          backgroundImage: SCANLINE_BG,
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between gap-2 px-4 h-14 border-b-2 border-border-strong"
          style={{ background: 'var(--theme-surface)', backgroundImage: SCANLINE_BG }}
        >
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted leading-none mb-1">
              {labels.channels}
            </p>
            {systemName && (
              <p className="text-[13px] font-black tracking-tight text-text leading-none truncate">
                {systemName}
              </p>
            )}
          </div>
        </div>

        {/* Section divider */}
        <div className="px-3 pt-3 pb-1.5">
          <div className="flex items-center gap-2 px-1">
            <span aria-hidden="true" className="text-primary text-[9px] leading-none">◆</span>
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-muted leading-none">
              TEXT
            </span>
            <span aria-hidden="true" className="flex-1 h-px bg-border-strong/40" />
            <button
              type="button"
              onClick={startCreate}
              aria-label={labels.addChannel}
              disabled={creating}
              className="text-muted hover:text-primary transition-colors duration-100
                focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 disabled:opacity-40"
            >
              <IconPlus size={13} />
            </button>
          </div>
        </div>

        {/* Channel list */}
        <ul className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {channels.map((c) => {
            const isActive = c.id === activeChannelId;
            return (
              <li key={c.id}>
                <ChannelRow
                  channel={c}
                  isActive={isActive}
                  canDelete={channels.length > 1}
                  onSelect={() => {
                    onSelect(c.id);
                    onClose();
                  }}
                  onDelete={() => onDelete(c.id)}
                  deleteLabel={labels.deleteChannel}
                />
              </li>
            );
          })}

          {/* Create form */}
          {creating && (
            <li className="pt-1">
              <div
                className="flex items-center gap-1.5 px-2 py-1.5 border-l-2 border-primary"
                style={{ background: 'rgb(var(--theme-primary-rgb) / 0.08)' }}
              >
                <span aria-hidden="true" className="text-primary/70 shrink-0"><IconHash size={13} /></span>
                <input
                  ref={createInputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitCreate();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelCreate();
                    }
                  }}
                  placeholder={labels.channelName}
                  maxLength={40}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none
                    text-[13px] font-semibold text-text placeholder:text-muted/60"
                />
                <button
                  type="button"
                  onClick={cancelCreate}
                  aria-label={labels.cancel}
                  className="shrink-0 text-muted hover:text-error transition-colors duration-100"
                >
                  <IconX size={12} />
                </button>
              </div>
              <p className="px-3 pt-1 text-[9px] text-muted/70 uppercase tracking-widest font-bold">
                {labels.channelNameHint}
              </p>
            </li>
          )}

          {!creating && (
            <li className="pt-1">
              <button
                type="button"
                onClick={startCreate}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] font-bold
                  text-muted hover:text-primary hover:bg-surface-alt
                  border border-dashed border-border-strong/40 hover:border-primary/40
                  transition-all duration-100 focus:outline-none
                  focus-visible:ring-1 focus-visible:ring-primary/60"
              >
                <IconPlus size={13} />
                <span className="text-[11px] uppercase tracking-widest font-black">{labels.addChannel}</span>
              </button>
            </li>
          )}
        </ul>
      </aside>
    </>
  );
}

function ChannelRow({
  channel,
  isActive,
  canDelete,
  onSelect,
  onDelete,
  deleteLabel,
}: {
  channel: Channel;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <div
      className={`group relative flex items-center gap-1 transition-all duration-100 ${
        isActive
          ? 'bg-surface-alt'
          : 'hover:bg-surface-alt/60'
      }`}
      style={isActive ? {
        borderLeft: '2px solid var(--theme-primary)',
        boxShadow: 'inset 0 0 0 1px rgb(var(--theme-primary-rgb) / 0.18)',
      } : { borderLeft: '2px solid transparent' }}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-left min-w-0
          focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/60
          ${isActive ? 'text-text' : 'text-muted hover:text-text'}`}
      >
        <span
          aria-hidden="true"
          className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted/70'}`}
          style={isActive ? { filter: 'drop-shadow(0 0 6px rgb(var(--theme-primary-rgb) / 0.6))' } : undefined}
        >
          <IconHash size={13} />
        </span>
        <span className={`flex-1 min-w-0 text-[13px] font-bold truncate leading-tight ${
          isActive ? 'text-text' : ''
        }`}>
          {channel.name}
        </span>
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={`${deleteLabel}: ${channel.name}`}
          className={`shrink-0 mr-1.5 w-5 h-5 flex items-center justify-center
            text-muted hover:text-error hover:bg-error/15
            transition-all duration-100 focus:outline-none
            focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-error/60
            ${isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-80 hover:opacity-100'}`}
          tabIndex={-1}
        >
          <IconX size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Channel Header (top bar) ────────────────────────────────────────────────

function ChannelHeader({
  channelName,
  systemName,
  onToggleChannels,
  channelsOpen,
  openLabel,
  closeLabel,
  pickerSlot,
}: {
  channelName: string;
  systemName: string;
  onToggleChannels: () => void;
  channelsOpen: boolean;
  openLabel: string;
  closeLabel: string;
  pickerSlot?: React.ReactNode;
}) {
  return (
    <header
      className="shrink-0 flex items-center gap-2 px-3 md:px-5 h-14 border-b-2 border-border-strong"
      style={{
        background: 'var(--theme-surface)',
        backgroundImage: SCANLINE_BG,
        boxShadow: 'inset 0 -1px 0 rgb(var(--theme-primary-rgb) / 0.18)',
      }}
    >
      <button
        type="button"
        onClick={onToggleChannels}
        aria-label={channelsOpen ? closeLabel : openLabel}
        aria-expanded={channelsOpen}
        className="md:hidden shrink-0 flex items-center justify-center h-9 w-9 -ml-1
          text-muted hover:text-text hover:bg-surface-alt
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
          transition-colors duration-150"
      >
        <IconMenu size={18} />
      </button>

      <div className="flex items-baseline gap-2 min-w-0 flex-1">
        <span
          aria-hidden="true"
          className="text-primary/70 shrink-0 leading-none"
          style={{ filter: 'drop-shadow(0 0 10px rgb(var(--theme-primary-rgb) / 0.45))' }}
        >
          <IconHash size={18} />
        </span>
        <h1 className="text-base md:text-lg font-black tracking-tight text-text leading-none truncate">
          {channelName}
        </h1>
        {systemName && (
          <>
            <span aria-hidden="true" className="hidden md:inline text-border-strong text-sm font-black leading-none shrink-0">
              /
            </span>
            <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.18em] text-muted leading-none truncate">
              {systemName}
            </span>
          </>
        )}
      </div>

      {pickerSlot && <div className="shrink-0">{pickerSlot}</div>}
    </header>
  );
}

// ─── Time Separator ──────────────────────────────────────────────────────────

function TimeSeparator({ createdAt, locale }: { createdAt: string; locale: string }) {
  const label = formatSeparatorDate(createdAt, locale);
  return (
    <div aria-label={label} className="flex items-center gap-3 my-5 select-none px-2">
      <span className="flex-1 h-px bg-border-strong/40" />
      <span
        className="text-[9px] font-black uppercase tracking-[0.22em] text-muted whitespace-nowrap px-3 py-1 border border-border-strong/50"
        style={{
          background: 'var(--theme-surface)',
          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        }}
      >
        {label}
      </span>
      <span className="flex-1 h-px bg-border-strong/40" />
    </div>
  );
}

// ─── Message Row ─────────────────────────────────────────────────────────────

function MessageRow({
  message,
  isFirst,
  onDelete,
  locale,
  deleteLabel,
  unknownLabel,
}: {
  message: ChatMessage;
  isFirst: boolean;
  onDelete: (id: string) => void;
  locale: string;
  deleteLabel: string;
  unknownLabel: string;
}) {
  const accentColor = ensureAccentReadable(message.memberColor ?? 'var(--theme-primary)');
  const displayName = message.memberName ?? unknownLabel;
  const time = formatTime(message.createdAt, locale);

  return (
    <div
      className={`group relative px-3 md:px-5 transition-colors duration-100
        hover:bg-surface-alt/40 ${isFirst ? 'mt-4' : 'mt-0.5'}`}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-80 transition-opacity duration-100"
        style={{ background: accentColor }}
      />

      {isFirst ? (
        <div className="flex items-start gap-3 py-1">
          <div className="pt-0.5">
            <MemberAvatar
              name={displayName}
              color={message.memberColor}
              avatarUrl={message.memberAvatarUrl}
              size={40}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
              <span className="text-[13.5px] font-black leading-none" style={{ color: accentColor }}>
                {displayName}
              </span>
              <span className="text-[10px] font-medium text-muted/80 leading-none tracking-wide">
                {time}
              </span>
            </div>
            <div
              className="text-[14px] text-text leading-[1.45]"
              style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {message.content}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 py-0">
          <div className="w-10 shrink-0 flex justify-end pr-1 pt-1">
            <span
              className="text-[9px] font-medium text-muted/0 group-hover:text-muted/70 transition-colors duration-100 leading-none tabular-nums"
              aria-hidden="true"
            >
              {time}
            </span>
          </div>
          <div
            className="flex-1 text-[14px] text-text leading-[1.45]"
            style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
          >
            {message.content}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onDelete(message.id)}
        aria-label={deleteLabel}
        className="absolute right-3 top-1 flex items-center justify-center w-6 h-6
          opacity-0 group-hover:opacity-100 transition-all duration-150
          text-muted hover:text-error hover:bg-error/15
          focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-error/60"
        tabIndex={-1}
      >
        <IconX size={12} />
      </button>
    </div>
  );
}

// ─── Sending-As Picker ───────────────────────────────────────────────────────

function SendingAsPicker({
  members,
  selected,
  onSelect,
  frontingIds,
  labels,
  direction = 'up',
  compact = false,
}: {
  members: MemberOption[];
  selected: MemberOption | null;
  onSelect: (m: MemberOption) => void;
  frontingIds: string[];
  labels: { sendAs: string; sendingAs: string; chooseAlter: string; searchAlter: string; noAlterFound: string; fronting: string };
  direction?: 'up' | 'down';
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members;
    const fronting = list.filter((m) => frontingIds.includes(m.id));
    const others = list.filter((m) => !frontingIds.includes(m.id));
    return { fronting, others };
  }, [members, frontingIds, query]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  const accentColor = ensureAccentReadable(selected?.color ?? 'var(--theme-primary)');

  return (
    <div ref={containerRef} className="relative shrink-0 self-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labels.sendingAs}
        className={compact
          ? 'relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 focus:outline-none'
          : 'flex items-center gap-2 px-2.5 py-1.5 border bg-surface transition-all duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 max-w-[170px]'
        }
        style={compact ? {
          boxShadow: open
            ? `0 0 0 2px ${accentColor}, 0 0 10px ${accentColor}55`
            : `0 0 0 1.5px ${accentColor}70`,
        } : {
          borderColor: selected?.color ? `${accentColor}55` : 'rgb(var(--theme-border-rgb) / 0.6)',
          borderLeftColor: accentColor,
          borderLeftWidth: '3px',
          borderRadius: '4px',
        }}
      >
        {compact ? (
          <>
            <MemberAvatar
              name={selected?.name ?? '?'}
              color={selected?.color ?? null}
              avatarUrl={selected?.avatarUrl ?? null}
              size={36}
            />
            {open && (
              <span
                className="absolute inset-0 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(0,0,0,0.54)' }}
                aria-hidden="true"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  className="text-white">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            )}
          </>
        ) : selected ? (
          <>
            <MemberAvatar name={selected.name} color={selected.color} avatarUrl={selected.avatarUrl} size={22} />
            <span className="text-[11px] font-black uppercase tracking-wider truncate" style={{ color: accentColor }}>
              {selected.name}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted font-black uppercase tracking-wider truncate">
            {labels.sendAs}
          </span>
        )}
        {!compact && (
          <svg aria-hidden="true" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-muted shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={labels.chooseAlter}
          className={`absolute ${direction === 'down' ? 'top-full mt-2 right-0' : 'bottom-full mb-3 left-0'} w-64 border-2 border-border-strong
            shadow-card-float overflow-hidden z-50 animate-slide-up`}
          style={{
            background: 'var(--theme-surface-raised)',
            backgroundImage: SCANLINE_BG,
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
          }}
        >
          <span aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 block w-2.5 h-2.5 border-t-2 border-r-2 border-primary" />

          {/* Current member header */}
          {selected && (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 border-b-2 border-border-strong/60"
              style={{ borderLeftColor: accentColor, borderLeftWidth: '3px' }}
            >
              <MemberAvatar name={selected.name} color={selected.color} avatarUrl={selected.avatarUrl} size={22} />
              <div className="flex-1 min-w-0">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted leading-none mb-[3px]">
                  {labels.sendingAs}
                </div>
                <div className="text-[12px] font-black truncate leading-none" style={{ color: accentColor }}>
                  {selected.name}
                </div>
              </div>
            </div>
          )}

          <div className="p-2 border-b border-border-strong/40">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchAlter}
              className="w-full bg-surface border border-border/60 px-2.5 py-1.5
                text-xs text-text placeholder:text-muted focus:outline-none
                focus:border-primary/60 transition-colors"
            />
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.fronting.length === 0 && filtered.others.length === 0 ? (
              <li className="px-3 py-3 text-xs text-muted text-center">{labels.noAlterFound}</li>
            ) : (
              <>
                {filtered.fronting.length > 0 && (
                  <>
                    <li className="px-3 pt-1.5 pb-1 text-[8px] font-black uppercase tracking-[0.22em] text-primary/80 select-none" role="presentation">
                      ◉ {labels.fronting}
                    </li>
                    {filtered.fronting.map((m) => (
                      <PickerRow key={m.id} member={m} selected={selected?.id === m.id} fronting
                        onSelect={() => { onSelect(m); setOpen(false); setQuery(''); }} />
                    ))}
                  </>
                )}
                {filtered.others.length > 0 && (
                  <>
                    {filtered.fronting.length > 0 && (
                      <li className="mx-3 my-1 h-px bg-border-strong/30" role="presentation" aria-hidden="true" />
                    )}
                    {filtered.others.map((m) => (
                      <PickerRow key={m.id} member={m} selected={selected?.id === m.id}
                        onSelect={() => { onSelect(m); setOpen(false); setQuery(''); }} />
                    ))}
                  </>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function PickerRow({
  member, selected, fronting, onSelect,
}: { member: MemberOption; selected: boolean; fronting?: boolean; onSelect: () => void }) {
  const rowAccent = ensureAccentReadable(member.color ?? 'var(--theme-primary)');
  return (
    <li>
      <button type="button" role="option" aria-selected={selected} onClick={onSelect}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-100
          focus:outline-none ${selected ? 'bg-primary/10' : 'hover:bg-surface-alt'}`}
        style={selected ? { borderLeft: `2px solid ${rowAccent}` } : { borderLeft: '2px solid transparent' }}
      >
        <MemberAvatar name={member.name} color={member.color} avatarUrl={member.avatarUrl} size={28} />
        <span className="text-[12.5px] font-bold truncate flex-1 leading-tight"
          style={{ color: selected ? rowAccent : undefined }}>
          {member.name}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {fronting && (
            <span aria-hidden="true" className="text-[8px] text-primary"
              style={{ filter: 'drop-shadow(0 0 4px rgb(var(--theme-primary-rgb) / 0.8))' }}>
              ◉
            </span>
          )}
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
              className="text-primary" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </button>
    </li>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ title, subtitle, channelName }: { title: string; subtitle: string; channelName: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center select-none gap-4 px-6 py-12">
      <div aria-hidden="true" className="text-5xl md:text-6xl text-primary/70"
        style={{ textShadow: '0 0 28px rgb(var(--theme-primary-rgb) / 0.5)' }}>
        ✦
      </div>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-primary/80"><IconHash size={14} /></span>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-text leading-none">
          {channelName}
        </span>
      </div>
      <p className="text-base font-bold text-text text-center max-w-sm leading-relaxed">
        {title}
      </p>
      <p className="text-sm text-muted text-center max-w-sm leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ChatClient({
  initialChannels,
  initialChannelId,
  initialMessages,
  initialMembers,
  frontingIds,
  systemName,
}: {
  initialChannels: Channel[];
  initialChannelId: string;
  initialMessages: ChatMessage[];
  initialMembers: MemberOption[];
  frontingIds: string[];
  systemName: string;
}) {
  const { t, language } = useLanguage();

  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [members] = useState<MemberOption[]>(initialMembers);

  const defaultMember = useMemo(() => {
    const fronting = initialMembers.find((m) => frontingIds.includes(m.id));
    return fronting ?? initialMembers[0] ?? null;
  }, [initialMembers, frontingIds]);

  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(defaultMember);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickyToBottomRef = useRef(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? channels[0] ?? null,
    [channels, activeChannelId]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const focusTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    // Move cursor to end if there's already content
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  }, []);

  // Initial focus + scroll on mount
  useEffect(() => {
    scrollToBottom('instant');
    focusTextarea();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-focus when switching channels
  useEffect(() => {
    focusTextarea();
  }, [activeChannelId, focusTextarea]);

  // "Type anywhere to focus" — Discord-style. If the user starts typing a
  // printable character anywhere on the page (outside other inputs), focus the
  // composer.
  useEffect(() => {
    function isTypableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function onKeyDown(e: KeyboardEvent) {
      // Ignore when modifier keys are held (shortcuts like Ctrl+C, Cmd+R)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Ignore non-printable keys (Arrow, Escape, F1, etc.)
      if (e.key.length !== 1) return;
      // Don't steal focus from other inputs / contenteditable areas
      if (isTypableTarget(document.activeElement)) return;
      // Don't fire during channel drawer (mobile) or other overlay states
      if (channelsOpen) return;
      // Focus the textarea — the keystroke will land there naturally because
      // we don't prevent default.
      focusTextarea();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focusTextarea, channelsOpen]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickyToBottomRef.current = distance < SCROLL_STICKY_THRESHOLD;
    setShowScrollDown(distance > SCROLL_STICKY_THRESHOLD * 2);
  }, []);

  useEffect(() => {
    if (stickyToBottomRef.current) scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  // Fetch messages for the active channel (on channel switch + polling)
  useEffect(() => {
    if (!activeChannelId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await apiFetch<{ messages: ChatMessage[] }>(
          `/api/chat?channelId=${encodeURIComponent(activeChannelId)}`
        );
        if (!cancelled) setMessages(data.messages);
      } catch {
        // silently ignore
      }
    };

    // Initial load on channel switch (but skip on first mount — we have initialMessages)
    // We compare against initialChannelId — if user has switched, fetch fresh.
    if (activeChannelId !== initialChannelId) {
      stickyToBottomRef.current = true;
      void load();
    }

    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeChannelId, initialChannelId]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 5 + 16;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [draft]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!channelsOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [channelsOpen]);

  // Lock page scroll while the chat is mounted — only the messages container should scroll.
  // Prevents the dashboard layout's min-h-dvh + padding from making the page taller than the viewport.
  useEffect(() => {
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBody;
      document.documentElement.style.overflow = originalHtml;
    };
  }, []);

  // Fix mobile keyboard pushing header off-screen.
  // dvh doesn't always update when the soft keyboard opens (especially in PWA
  // mode on iOS Safari), so we use the visualViewport API to set the container
  // height directly. When the keyboard is open the mobile nav bar sits behind
  // the keyboard, so we use the full visual-viewport height; when closed we
  // subtract the mobile nav height (5rem = 80px).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || window.innerWidth >= 768) return;

    const MOBILE_NAV_H = 80; // 5rem
    const fullHeight = vv.height;

    function update() {
      const el = chatContainerRef.current;
      if (!el) return;
      const isKeyboardOpen = vv!.height < fullHeight - 100;
      const h = isKeyboardOpen ? vv!.height : vv!.height - MOBILE_NAV_H;
      el.style.height = `${Math.max(h, 200)}px`;
    }

    vv.addEventListener('resize', update);
    update();
    return () => vv.removeEventListener('resize', update);
  }, []);

  // Channel handlers
  const handleSelectChannel = useCallback((id: string) => {
    setActiveChannelId(id);
    setMessages([]); // clear immediately, will refetch
    setError(null);
  }, []);

  const handleCreateChannel = useCallback(async (name: string) => {
    setError(null);
    try {
      const data = await apiFetch<{ channel: Channel }>('/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setChannels((prev) => [...prev, data.channel]);
      setActiveChannelId(data.channel.id);
      setMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, []);

  const handleDeleteChannel = useCallback(async (id: string) => {
    const ch = channels.find((c) => c.id === id);
    if (!ch) return;
    if (channels.length <= 1) {
      setError(t('chat.cannotDeleteLast'));
      return;
    }
    const confirmed = window.confirm(
      t('chat.confirmDeleteChannel', { name: ch.name })
    );
    if (!confirmed) return;

    setError(null);
    try {
      await apiFetch<{ deleted: boolean }>(`/api/chat/channels/${id}`, { method: 'DELETE' });
      const remaining = channels.filter((c) => c.id !== id);
      setChannels(remaining);
      if (activeChannelId === id) {
        setActiveChannelId(remaining[0].id);
        setMessages([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, [channels, activeChannelId, t]);

  // Send
  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (!content || isSending || !activeChannelId) return;
    setError(null);
    setIsSending(true);

    void (async () => {
      try {
        const result = await apiFetch<{
          message: { id: string; content: string; createdAt: string; memberId: string | null; channelId: string | null };
        }>('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            memberId: selectedMember?.id ?? null,
            channelId: activeChannelId,
          }),
        });
        const optimistic: ChatMessage = {
          id: result.message.id,
          content: result.message.content,
          createdAt: result.message.createdAt,
          memberId: result.message.memberId,
          channelId: result.message.channelId,
          memberName: selectedMember?.name ?? t('chat.unknown'),
          memberColor: selectedMember?.color ?? null,
          memberAvatarUrl: selectedMember?.avatarUrl ?? null,
        };
        stickyToBottomRef.current = true;
        setMessages((prev) => [...prev, optimistic]);
        setDraft('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('chat.sendError'));
      } finally {
        setIsSending(false);
        // Keep typing flow alive — re-focus the composer after send completes
        focusTextarea();
      }
    })();
  }, [draft, isSending, selectedMember, activeChannelId, t, focusTextarea]);

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    void apiFetch<{ deleted: boolean }>(`/api/chat/${id}`, { method: 'DELETE' }).catch(() => {
      if (activeChannelId) {
        void apiFetch<{ messages: ChatMessage[] }>(`/api/chat?channelId=${encodeURIComponent(activeChannelId)}`)
          .then((d) => setMessages(d.messages))
          .catch(() => null);
      }
    });
  }, [activeChannelId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // On touch devices (mobile), Enter inserts a newline naturally
        if (window.matchMedia('(pointer: coarse)').matches) return;
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Build rendered items
  type RenderedItem =
    | { type: 'separator'; createdAt: string; key: string }
    | { type: 'message'; message: ChatMessage; isFirst: boolean; key: string };

  const rendered: RenderedItem[] = [];
  let prevSenderId: string | null = null;
  let prevTime: number | null = null;
  for (const msg of messages) {
    const time = parseIso(msg.createdAt).getTime();
    if (prevTime !== null && time - prevTime > GAP_THRESHOLD_MS) {
      rendered.push({ type: 'separator', createdAt: msg.createdAt, key: `sep-${msg.id}` });
      prevSenderId = null;
    }
    const senderId = msg.memberId ?? `anon-${msg.memberName ?? 'unknown'}`;
    const isFirst = senderId !== prevSenderId;
    rendered.push({ type: 'message', message: msg, isFirst, key: msg.id });
    prevSenderId = senderId;
    prevTime = time;
  }

  const channelName = activeChannel?.name ?? t('chat.channel');

  return (
    <div
      ref={chatContainerRef}
      className="-mx-4 md:-mx-8 -my-5 md:-my-8 flex flex-col
        h-[calc(100dvh-5rem-env(safe-area-inset-bottom))]
        md:h-[calc(100dvh-56px)]"
    >
      <div className="flex-1 flex min-h-0">
        <ChannelsSidebar
          channels={channels}
          activeChannelId={activeChannelId}
          onSelect={handleSelectChannel}
          onCreate={handleCreateChannel}
          onDelete={handleDeleteChannel}
          isOpen={channelsOpen}
          onClose={() => setChannelsOpen(false)}
          systemName={systemName}
          labels={{
            channels: t('chat.channels'),
            addChannel: t('chat.addChannel'),
            newChannel: t('chat.newChannel'),
            channelName: t('chat.channelName'),
            channelNameHint: t('chat.channelNameHint'),
            create: t('chat.create'),
            cancel: t('chat.cancel'),
            deleteChannel: t('chat.deleteChannel'),
            closeChannels: t('chat.closeChannels'),
          }}
        />

        {/* Main chat column */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ChannelHeader
            channelName={channelName}
            systemName={systemName}
            onToggleChannels={() => setChannelsOpen((v) => !v)}
            channelsOpen={channelsOpen}
            openLabel={t('chat.openChannels')}
            closeLabel={t('chat.closeChannels')}
          />

          {/* Messages scroll area */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto relative"
            aria-live="polite"
            aria-label={t('chat.title')}
          >
            {messages.length === 0 ? (
              <EmptyState
                title={t('chat.emptyTitle')}
                subtitle={t('chat.emptySubtitle')}
                channelName={channelName}
              />
            ) : (
              <div className="py-3">
                {rendered.map((item) =>
                  item.type === 'separator' ? (
                    <TimeSeparator key={item.key} createdAt={item.createdAt} locale={language} />
                  ) : (
                    <MessageRow
                      key={item.key}
                      message={item.message}
                      isFirst={item.isFirst}
                      onDelete={handleDeleteMessage}
                      locale={language}
                      deleteLabel={t('chat.deleteMessage')}
                      unknownLabel={t('chat.unknown')}
                    />
                  )
                )}
              </div>
            )}
            <div ref={messagesEndRef} style={{ height: 1 }} />
          </div>

          {showScrollDown && (
            <button
              type="button"
              onClick={() => {
                stickyToBottomRef.current = true;
                scrollToBottom('smooth');
              }}
              aria-label="Scroll to bottom"
              className="absolute right-3 z-10 flex items-center justify-center w-9 h-9
                bg-surface-raised border-2 border-border-strong text-primary
                shadow-card-float hover:bg-primary hover:text-bg
                transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
                animate-fade-in"
              style={{
                bottom: 'calc(env(safe-area-inset-bottom) + 100px)',
                clipPath: 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
              }}
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}

          {error && (
            <div role="alert"
              className="shrink-0 mx-3 md:mx-5 mb-2 px-3 py-2 border-l-2 border-error bg-error/10 text-xs text-error flex items-center justify-between gap-2"
            >
              <span className="truncate">{error}</span>
              <button type="button" onClick={() => setError(null)}
                className="shrink-0 text-[10px] font-black uppercase tracking-widest underline hover:no-underline focus:outline-none"
              >
                {t('chat.close')}
              </button>
            </div>
          )}

          {/* Input area */}
          <div
            className="shrink-0 border-t-2 border-border-strong p-2.5 md:p-3"
            style={{ background: 'var(--theme-surface)', backgroundImage: SCANLINE_BG }}
          >
            <div
              className="flex items-end gap-2 p-1.5 border border-border-strong transition-all duration-300"
              style={{
                background: 'var(--theme-surface-raised)',
                borderLeftColor: ensureAccentReadable(selectedMember?.color ?? 'var(--theme-primary)'),
                borderLeftWidth: '3px',
              }}
            >
              <SendingAsPicker
                members={members}
                selected={selectedMember}
                onSelect={setSelectedMember}
                frontingIds={frontingIds}
                compact
                labels={{
                  sendAs: t('chat.sendAs'),
                  sendingAs: t('chat.sendingAs'),
                  chooseAlter: t('chat.chooseAlter'),
                  searchAlter: t('chat.searchAlter'),
                  noAlterFound: t('chat.noAlterFound'),
                  fronting: t('chat.fronting'),
                }}
              />
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${t('chat.messagePlaceholder')}  #${channelName}`}
                rows={1}
                disabled={isSending || !activeChannelId}
                aria-label={t('chat.messagePlaceholder')}
                className="flex-1 resize-none bg-transparent text-[14px] text-text placeholder:text-muted
                  focus:outline-none leading-relaxed py-1.5 px-1
                  disabled:opacity-50 transition-opacity"
                style={{ minHeight: '32px', maxHeight: '116px', overflowY: 'auto' }}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!draft.trim() || isSending || !activeChannelId}
                aria-label={t('chat.sendMessage')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black
                  uppercase tracking-widest bg-primary text-bg shrink-0
                  disabled:opacity-30 disabled:cursor-not-allowed
                  hover:brightness-110 active:scale-[0.97]
                  transition-all duration-150 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-primary/60"
                style={{
                  clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                  boxShadow: !isSending && draft.trim()
                    ? '0 0 14px rgb(var(--theme-primary-rgb) / 0.45)'
                    : undefined,
                }}
              >
                <IconSend size={13} />
                <span className="hidden sm:inline">{t('chat.send')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
