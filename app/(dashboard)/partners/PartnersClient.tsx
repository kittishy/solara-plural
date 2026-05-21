'use client';

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

// ─── PartnerRow ───────────────────────────────────────────────────────────────

function PartnerRow({
  partner,
}: {
  partner: PartnerItem;
}) {
  return (
    <li
      role="listitem"
      className="relative flex items-center border-b border-border/40 last:border-b-0 bg-surface hover:bg-surface-alt/60 transition-colors duration-150"
      style={{ borderLeft: `3px solid ${PARTNER_COLOR}` }}
    >
      <Link
        href={`/systems/${partner.id}`}
        className="flex flex-1 items-center gap-3.5 px-4 py-3.5 min-w-0 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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

    </li>
  );
}

// ─── PartnersClient ───────────────────────────────────────────────────────────

export default function PartnersClient() {
  const { data, isLoading, error } = useSWR<PartnersPayload>(swrKeys.partners, apiFetcher);

  const partners = data?.partners ?? [];
  const incoming = data?.incomingRequests ?? [];
  const outgoing = data?.outgoingRequests ?? [];

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
            </div>
          </div>
        ) : (
          <ul role="list" className="rounded-xl overflow-hidden border border-border/40">
            {partners.map((partner) => (
              <PartnerRow
                key={partner.partnershipId}
                partner={partner}
              />
            ))}
          </ul>
        )}
      </div>

    </>
  );
}
