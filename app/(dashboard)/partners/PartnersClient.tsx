'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { apiFetcher, revalidatePartners, swrKeys } from '@/lib/swr';
import { formatDateLong, formatTimeSince } from '@/lib/client/format';

// ─── Types ────────────────────────────────────────────────────────────────────

type FrontingMember = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
  pronouns: string | null;
};

type CurrentFront = {
  startedAt: Date | string;
  members: FrontingMember[];
};

type SharedPartnerMember = FrontingMember & {
  description?: string | null;
  role?: string | null;
  tags?: string[];
  visibility?: string;
};

type PartnerItem = {
  partnershipId: string;
  id: string;
  name: string;
  accountType: string;
  avatarMode: string;
  avatarEmoji: string;
  avatarUrl: string | null;
  description: string | null;
  relationshipLabel: string | null;
  partneredSince: Date | string | null;
  connectedAt: Date | string;
  currentFront: CurrentFront | null;
  sharedMembers: SharedPartnerMember[];
};

type RequestItem = {
  requestId: string;
  message: string | null;
  createdAt: Date | string;
};

type IncomingRequest = RequestItem & { from: { id: string; name: string; accountType: string } };
type OutgoingRequest = RequestItem & { to: { id: string; name: string; accountType: string } };

type PartnersPayload = {
  partners: PartnerItem[];
  incomingRequests: IncomingRequest[];
  outgoingRequests: OutgoingRequest[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTNER_COLOR = '#f472b6'; // partner rose

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  return formatDateLong(date, 'Unknown date');
}

function SystemAvatar({
  partner,
  size = 'md',
}: {
  partner: Pick<PartnerItem, 'avatarMode' | 'avatarEmoji' | 'avatarUrl' | 'name'>;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-10 h-10 text-xl' : 'w-14 h-14 text-2xl';
  if (partner.avatarMode === 'url' && partner.avatarUrl) {
    return (
      <DynamicAvatarImage
        src={partner.avatarUrl}
        alt={partner.name}
        className={`${dim} rounded-xl object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-xl flex-shrink-0 flex items-center justify-center
        bg-surface-alt border border-border/40`}
      aria-hidden="true"
    >
      {partner.avatarEmoji}
    </div>
  );
}

// ─── EditSheet ────────────────────────────────────────────────────────────────

type SheetAction = 'edit' | 'end';

function PartnerSheet({
  partner,
  onClose,
  onEndPartnership,
}: {
  partner: PartnerItem | null;
  onClose: () => void;
  onEndPartnership: (partner: PartnerItem) => void;
}) {
  const [view, setView] = useState<'menu' | 'edit'>('menu');
  const [label, setLabel] = useState('');
  const [since, setSince] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = partner !== null;

  useEffect(() => {
    if (isOpen && partner) {
      setView('menu');
      setLabel(partner.relationshipLabel ?? '');
      setSince(
        partner.partneredSince
          ? new Date(partner.partneredSince).toISOString().split('T')[0]
          : ''
      );
      setError(null);
      const id = setTimeout(() => firstButtonRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen, partner]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function saveEdit() {
    if (!partner) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/partners/${partner.partnershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipLabel: label.trim() || null,
          partneredSince: since || null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      revalidatePartners();
      onClose();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        role="dialog"
        aria-label="Partner actions"
        aria-modal="true"
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-surface border-t border-border shadow-2xl
          pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-1" aria-hidden="true" />

        {partner && (
          <p className="text-sm font-semibold text-text text-center px-4 py-3 border-b border-border/40">
            {partner.name}
          </p>
        )}

        {view === 'menu' ? (
          <div role="group" aria-label="Partner options">
            {/* Edit relationship */}
            <button
              ref={firstButtonRef}
              type="button"
              onClick={() => setView('edit')}
              className="flex w-full items-center gap-4 px-6 min-h-[56px] text-text transition-colors hover:bg-surface-alt"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span className="text-sm font-medium">Edit relationship details</span>
            </button>

            {/* Downgrade to friend only */}
            <button
              type="button"
              onClick={() => { if (partner) { onEndPartnership(partner); onClose(); } }}
              className="flex w-full items-center gap-4 px-6 min-h-[56px] text-muted transition-colors
                border-t border-border/40 hover:bg-surface-alt"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-sm font-medium">Keep friendship, remove partner status</span>
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center gap-4 px-6 min-h-[56px] text-muted transition-colors
                border-t border-border/40 hover:bg-surface-alt"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="text-sm font-medium">No action</span>
            </button>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            <button
              type="button"
              onClick={() => setView('menu')}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>

            <div className="space-y-2">
              <label htmlFor="relationship-label" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Relationship label
              </label>
              <input
                id="relationship-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. partners, datemates, QPR…"
                maxLength={60}
                className="input w-full min-h-[44px] px-3"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="partnered-since" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Together since
              </label>
              <input
                id="partnered-since"
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="input w-full min-h-[44px] px-3"
              />
            </div>

            {error && <p role="alert" className="text-xs text-error">{error}</p>}

            <div className="flex gap-3 pb-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="btn-primary flex-1 min-h-[44px] justify-center"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-1 min-h-[44px] justify-center border border-border/60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── InviteSheet ──────────────────────────────────────────────────────────────

function InviteSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setMessage('');
      setStatus(null);
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setStatus({ type: 'success', text: `Partner request sent to ${data.data?.to?.name ?? 'them'} 💜` });
        setEmail('');
        setMessage('');
        revalidatePartners();
      } else {
        setStatus({ type: 'error', text: data?.error ?? 'Could not send request.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        role="dialog"
        aria-label="Invite partner"
        aria-modal="true"
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-surface border-t border-border
          pb-[env(safe-area-inset-bottom)] transition-transform duration-300
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-1" aria-hidden="true" />
        <p className="text-sm font-semibold text-text text-center px-4 py-3 border-b border-border/40">
          Relationship partner request
        </p>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-muted">
            Partners are for closer relationships, like a girlfriend, wife, datemate, or committed partner system. Add them as a friend first, then make the relationship explicit here.
          </p>
          <div className="space-y-2">
            <label htmlFor="partner-email" className="block text-xs font-semibold text-muted uppercase tracking-wider">
              Their email
            </label>
            <input
              ref={inputRef}
              id="partner-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
              placeholder="partner@email.com"
              className="input w-full min-h-[44px] px-3"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="partner-message" className="block text-xs font-semibold text-muted uppercase tracking-wider">
              Message <span className="font-normal normal-case text-subtle">(optional)</span>
            </label>
            <textarea
              id="partner-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              placeholder="Add a short note…"
              rows={3}
              className="input w-full px-3 py-2 resize-none"
            />
            <p className="text-right text-xs text-subtle">{message.length}/280</p>
          </div>

          {status && (
            <p
              role={status.type === 'error' ? 'alert' : 'status'}
              className={`text-sm font-medium ${status.type === 'error' ? 'text-error' : 'text-success'}`}
            >
              {status.text}
            </p>
          )}

          <div className="flex gap-3 pb-2">
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !email.trim()}
              className="btn-primary flex-1 min-h-[44px] justify-center disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 min-h-[44px] justify-center border border-border/60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── PartnerRow ───────────────────────────────────────────────────────────────

function PartnerRow({
  partner,
  onOpenSheet,
}: {
  partner: PartnerItem;
  onOpenSheet: (partner: PartnerItem) => void;
}) {
  return (
    <li
      role="listitem"
      className="relative flex items-center border-b border-border/40 last:border-b-0 bg-surface hover:bg-surface-alt/60 transition-colors duration-150"
      style={{ borderLeft: `3px solid ${PARTNER_COLOR}` }}
    >
      <Link
        href={`/systems/${partner.id}`}
        className="flex flex-1 items-center gap-3.5 px-4 py-3.5 pr-14 min-w-0 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        aria-label={`Open ${partner.name} profile`}
      >
        <SystemAvatar partner={partner} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-text text-base leading-snug truncate">
              {partner.name}
            </p>
            {partner.relationshipLabel && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ backgroundColor: `${PARTNER_COLOR}18`, color: PARTNER_COLOR }}
              >
                {partner.relationshipLabel}
              </span>
            )}
          </div>

          {partner.partneredSince && (
            <p className="text-xs text-muted mt-0.5">
              Together since {formatDate(partner.partneredSince)}
            </p>
          )}

          {partner.currentFront ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative inline-flex h-2 w-2 flex-shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full animate-pulse"
                  style={{ backgroundColor: PARTNER_COLOR, opacity: 0.6 }} />
                <span className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: PARTNER_COLOR }} />
              </span>
              <span className="text-xs font-medium" style={{ color: PARTNER_COLOR }}>
                {partner.currentFront.members.length > 0
                  ? partner.currentFront.members.map((m) => m.name).join(', ')
                  : 'Fronting'
                } · {formatTimeSince(partner.currentFront.startedAt)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-subtle mt-0.5">No shared front visible right now</p>
          )}
          <p className="text-xs text-subtle mt-1">
            {partner.sharedMembers.length} shared member{partner.sharedMembers.length === 1 ? '' : 's'}
          </p>
          <Link
            href={`/partners/${partner.partnershipId}`}
            className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Relationship details →
          </Link>
        </div>
      </Link>

      {/* Action button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label={`Actions for ${partner.name}`}
          aria-haspopup="dialog"
          onClick={() => onOpenSheet(partner)}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] w-9 h-9 rounded-lg
            border border-border/60 bg-surface-alt text-muted
            hover:border-primary/40 hover:text-primary-glow
            active:scale-95 transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
    </li>
  );
}

// ─── PartnersClient ───────────────────────────────────────────────────────────

export default function PartnersClient() {
  const { data, isLoading, error } = useSWR<PartnersPayload>(swrKeys.partners, apiFetcher);
  const [sheetPartner, setSheetPartner] = useState<PartnerItem | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const partners = data?.partners ?? [];
  const incoming = data?.incomingRequests ?? [];
  const outgoing = data?.outgoingRequests ?? [];

  async function handleEndPartnership(partner: PartnerItem) {
    const res = await fetch(`/api/partners/${partner.partnershipId}`, { method: 'DELETE' });
    if (res.ok) revalidatePartners();
  }

  async function respondToRequest(requestId: string, action: 'accept' | 'decline') {
    const res = await fetch(`/api/partners/requests/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) revalidatePartners();
  }

  async function cancelRequest(requestId: string) {
    await fetch(`/api/partners/requests/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    revalidatePartners();
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-8 w-28" />
            <div className="skeleton h-3.5 w-20" />
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-border/40">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-[80px] rounded-none border-b border-border/30 last:border-0" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in space-y-5">
        <h1 className="text-2xl font-bold text-text">Partners</h1>
        <p role="alert" className="text-sm text-error">Could not load partners. Please refresh.</p>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Partners</h1>
            <p className="text-muted text-sm mt-0.5">
              {partners.length === 0
                ? 'No relationship partners yet'
                : `${partners.length} relationship partner${partners.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="btn-primary gap-1.5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            Invite partner
          </button>
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Partner requests
            </p>
            <ul role="list" className="rounded-xl overflow-hidden border border-border/40">
              {incoming.map((req) => (
                <li
                  key={req.requestId}
                  role="listitem"
                  className="border-b border-border/40 last:border-b-0 bg-surface px-4 py-3.5"
                  style={{ borderLeft: `3px solid ${PARTNER_COLOR}` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{req.from.name}</p>
                      {req.message && (
                        <p className="text-xs text-muted mt-0.5 italic">&ldquo;{req.message}&rdquo;</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => respondToRequest(req.requestId, 'accept')}
                        className="rounded-lg px-3 py-1 text-xs font-semibold border transition-colors"
                        style={{ borderColor: `${PARTNER_COLOR}60`, color: PARTNER_COLOR }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respondToRequest(req.requestId, 'decline')}
                        className="rounded-lg border border-border/60 px-3 py-1 text-xs font-medium text-muted
                          transition-colors hover:border-border hover:text-text"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Outgoing requests */}
        {outgoing.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Sent requests
            </p>
            <ul role="list" className="rounded-xl overflow-hidden border border-border/40">
              {outgoing.map((req) => (
                <li
                  key={req.requestId}
                  role="listitem"
                  className="border-b border-border/40 last:border-b-0 bg-surface px-4 py-3.5"
                  style={{ borderLeft: '3px solid transparent' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{req.to.name}</p>
                      <p className="text-xs text-muted mt-0.5">Waiting for response…</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelRequest(req.requestId)}
                      className="rounded-lg border border-border/60 px-3 py-1 text-xs font-medium text-muted
                        transition-colors hover:border-border hover:text-text flex-shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Partners list */}
        {partners.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <div className="stagger-children flex flex-col items-center">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ backgroundColor: `${PARTNER_COLOR}18` }}
                aria-hidden="true"
              >
                <span className="text-3xl">🌸</span>
              </div>
              <p className="text-text font-semibold">No relationship partners yet</p>
              <p className="text-muted text-sm mt-2 mb-6">
                Partners are different from friends: closer, more intimate, and meant for relationships like girlfriend, wife, datemate, or committed partner system.
              </p>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="btn-primary gap-1.5"
              >
                Invite your partner
              </button>
            </div>
          </div>
        ) : (
          <ul role="list" className="rounded-xl overflow-hidden border border-border/40">
            {partners.map((partner) => (
              <PartnerRow
                key={partner.partnershipId}
                partner={partner}
                onOpenSheet={setSheetPartner}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Sheets */}
      <PartnerSheet
        partner={sheetPartner}
        onClose={() => setSheetPartner(null)}
        onEndPartnership={handleEndPartnership}
      />
      <InviteSheet
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </>
  );
}
