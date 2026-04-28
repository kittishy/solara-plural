'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type AccountType = 'system' | 'singlet';
type ShareVisibility = 'hidden' | 'profile' | 'full';
type ShareFieldKey = 'pronouns' | 'description' | 'avatarUrl' | 'color' | 'role' | 'tags' | 'notes';
type ShareFieldVisibility = Record<ShareFieldKey, boolean>;

type FriendSummary = {
  friendshipId: string;
  id: string;
  name: string;
  description: string | null;
  accountType: AccountType;
  avatarMode?: 'emoji' | 'url' | null;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  connectedAt: string;
};

type IncomingRequest = {
  requestId: string;
  from: {
    id: string;
    name: string;
    accountType: AccountType;
  };
  message: string | null;
  createdAt: string;
};

type OutgoingRequest = {
  requestId: string;
  to: {
    id: string;
    name: string;
    accountType: AccountType;
  };
  message: string | null;
  createdAt: string;
};

type BlockRecord = {
  blockId: string;
  system: {
    id: string;
    name: string;
    accountType: AccountType;
  };
  createdAt: string;
};

type FriendsPayload = {
  account: {
    id: string;
    name: string;
    email: string;
    accountType: AccountType;
  };
  friends: FriendSummary[];
  incomingRequests: IncomingRequest[];
  outgoingRequests: OutgoingRequest[];
  blocks: {
    blockedByMe: BlockRecord[];
    blockedMe: BlockRecord[];
  };
};

type SharingMember = {
  id: string;
  name: string;
  isArchived: boolean;
  visibility: ShareVisibility;
  fieldVisibility: ShareFieldVisibility;
  updatedAt: string | null;
};

type SharingPayload = {
  friend: {
    id: string;
    name: string;
    accountType: AccountType;
  };
  members: SharingMember[];
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string };

type Alert = { type: 'success' | 'error' | 'info'; message: string };
type SharingState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  members: SharingMember[];
};

const ACCOUNT_LABEL: Record<AccountType, string> = {
  system: 'System',
  singlet: 'Singlet',
};

const VISIBILITY_LABEL: Record<ShareVisibility, string> = {
  hidden: 'Hidden',
  profile: 'Basic profile',
  full: 'Full profile',
};

const VISIBILITY_OPTIONS: ShareVisibility[] = ['hidden', 'profile', 'full'];
const FIELD_KEYS: ShareFieldKey[] = ['pronouns', 'description', 'avatarUrl', 'color', 'role', 'tags', 'notes'];
const FIELD_LABEL: Record<ShareFieldKey, string> = {
  pronouns: 'Pronouns',
  description: 'Description',
  avatarUrl: 'Avatar',
  color: 'Color',
  role: 'Role',
  tags: 'Tags',
  notes: 'Notes',
};

export default function FriendsClient() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);
  const [payload, setPayload] = useState<FriendsPayload | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [sharingByFriendId, setSharingByFriendId] = useState<Record<string, SharingState>>({});
  const [savingShareKey, setSavingShareKey] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/friends');
      const body = await readJson<FriendsPayload>(res);

      if (!body.success) {
        setAlert({ type: 'error', message: body.error ?? 'Could not load friends right now.' });
        setLoading(false);
        return;
      }

      setPayload(body.data);
    } catch {
      setAlert({ type: 'error', message: 'Could not load friends right now.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  const totalPending = useMemo(() => {
    if (!payload) return 0;
    return payload.incomingRequests.length + payload.outgoingRequests.length;
  }, [payload]);

  async function inviteFriend(e: React.FormEvent) {
    e.preventDefault();
    if (inviting) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMessage = message.trim();

    if (!normalizedEmail) {
      setAlert({ type: 'error', message: 'Please add the friend email first.' });
      setInviteFieldError('Email is required.');
      return;
    }
    if (!isLikelyEmail(normalizedEmail)) {
      setInviteFieldError('Please use a valid email format.');
      return;
    }
    if (payload && normalizedEmail === payload.account.email.trim().toLowerCase()) {
      setInviteFieldError('You cannot invite your own account.');
      return;
    }
    if (normalizedMessage.length > 280) {
      setInviteFieldError('Invite message must be 280 characters or less.');
      return;
    }

    setInviteFieldError(null);
    setInviting(true);
    setAlert({ type: 'info', message: 'Sending invitation...' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, message: normalizedMessage || null }),
        signal: controller.signal,
      });
      const body = await readJson<unknown>(res);

      if (!body.success) {
        setAlert({ type: 'error', message: body.error ?? 'Could not send invitation.' });
        setInviteFieldError(body.error ?? 'Could not send invitation.');
        return;
      }

      setEmail('');
      setMessage('');
      setAlert({ type: 'success', message: 'Invitation sent with care.' });
      await loadFriends();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setAlert({ type: 'error', message: 'Invitation timed out. Please try again.' });
        setInviteFieldError('Request timed out. Please retry.');
      } else {
        setAlert({ type: 'error', message: 'Could not send invitation.' });
        setInviteFieldError('Could not reach the server. Please retry.');
      }
    } finally {
      clearTimeout(timeout);
      setInviting(false);
    }
  }

  async function respond(requestId: string, action: 'accept' | 'decline' | 'cancel') {
    setBusy(true);

    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await readJson<unknown>(res);

      if (!body.success) {
        setAlert({ type: 'error', message: body.error ?? 'Could not update request.' });
        setBusy(false);
        return;
      }

      if (action === 'accept') {
        setAlert({ type: 'success', message: 'Friend request accepted.' });
      } else if (action === 'decline') {
        setAlert({ type: 'info', message: 'Friend request declined.' });
      } else {
        setAlert({ type: 'info', message: 'Friend request canceled.' });
      }

      await loadFriends();
    } catch {
      setAlert({ type: 'error', message: 'Could not update request.' });
    } finally {
      setBusy(false);
    }
  }

  async function unfriend(friendSystemId: string) {
    setBusy(true);

    try {
      const res = await fetch(`/api/friends/${friendSystemId}`, { method: 'DELETE' });
      const body = await readJson<unknown>(res);

      if (!body.success) {
        setAlert({ type: 'error', message: body.error ?? 'Could not remove friendship.' });
        setBusy(false);
        return;
      }

      setAlert({ type: 'success', message: 'Friendship removed.' });
      await loadFriends();
    } catch {
      setAlert({ type: 'error', message: 'Could not remove friendship.' });
    } finally {
      setBusy(false);
    }
  }

  async function blockAccount(friendSystemId: string) {
    setBusy(true);

    try {
      const res = await fetch('/api/friends/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedSystemId: friendSystemId }),
      });
      const body = await readJson<unknown>(res);

      if (!body.success) {
        setAlert({ type: 'error', message: body.error ?? 'Could not block account.' });
        setBusy(false);
        return;
      }

      setAlert({ type: 'info', message: 'Account blocked. Invites and sharing are now disabled.' });
      await loadFriends();
    } catch {
      setAlert({ type: 'error', message: 'Could not block account.' });
    } finally {
      setBusy(false);
    }
  }

  async function unblockAccount(blockedSystemId: string) {
    setBusy(true);

    try {
      const res = await fetch(`/api/friends/blocks/${blockedSystemId}`, {
        method: 'DELETE',
      });
      const body = await readJson<unknown>(res);

      if (!body.success) {
        setAlert({ type: 'error', message: body.error ?? 'Could not unblock account.' });
        setBusy(false);
        return;
      }

      setAlert({ type: 'success', message: 'Account unblocked.' });
      await loadFriends();
    } catch {
      setAlert({ type: 'error', message: 'Could not unblock account.' });
    } finally {
      setBusy(false);
    }
  }

  async function toggleSharing(friendSystemId: string) {
    const current = sharingByFriendId[friendSystemId];

    if (current?.open) {
      setSharingByFriendId((prev) => ({
        ...prev,
        [friendSystemId]: {
          ...prev[friendSystemId],
          open: false,
        },
      }));
      return;
    }

    if (current?.members?.length) {
      setSharingByFriendId((prev) => ({
        ...prev,
        [friendSystemId]: {
          ...prev[friendSystemId],
          open: true,
        },
      }));
      return;
    }

    setSharingByFriendId((prev) => ({
      ...prev,
      [friendSystemId]: {
        open: true,
        loading: true,
        error: null,
        members: [],
      },
    }));

    try {
      const res = await fetch(`/api/friends/sharing/${friendSystemId}`);
      const body = await readJson<SharingPayload>(res);

      if (!body.success) {
        setSharingByFriendId((prev) => ({
          ...prev,
          [friendSystemId]: {
            open: true,
            loading: false,
            error: body.error ?? 'Could not load sharing settings.',
            members: [],
          },
        }));
        return;
      }

      setSharingByFriendId((prev) => ({
        ...prev,
        [friendSystemId]: {
          open: true,
          loading: false,
          error: null,
          members: body.data.members,
        },
      }));
    } catch {
      setSharingByFriendId((prev) => ({
        ...prev,
        [friendSystemId]: {
          open: true,
          loading: false,
          error: 'Could not load sharing settings.',
          members: [],
        },
      }));
    }
  }

  async function updateMemberSharing(
    friendSystemId: string,
    memberId: string,
    nextVisibility: ShareVisibility,
    nextFieldVisibility: ShareFieldVisibility,
  ) {
    const shareKey = `${friendSystemId}:${memberId}`;
    setSavingShareKey(shareKey);

    try {
      const res = await fetch(`/api/friends/sharing/${friendSystemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          visibility: nextVisibility,
          fieldVisibility: nextFieldVisibility,
        }),
      });
      const body = await readJson<unknown>(res);

      if (!body.success) {
        setAlert({ type: 'error', message: body.error ?? 'Could not update sharing visibility.' });
        setSavingShareKey(null);
        return;
      }

      setSharingByFriendId((prev) => {
        const current = prev[friendSystemId];
        if (!current) return prev;

        return {
          ...prev,
          [friendSystemId]: {
            ...current,
            members: current.members.map((member) =>
              member.id === memberId
                ? {
                    ...member,
                    visibility: nextVisibility,
                    fieldVisibility: nextFieldVisibility,
                    updatedAt: new Date().toISOString(),
                  }
                : member,
            ),
          },
        };
      });

      setAlert({ type: 'success', message: 'Sharing visibility updated.' });
    } catch {
      setAlert({ type: 'error', message: 'Could not update sharing visibility.' });
    } finally {
      setSavingShareKey(null);
    }
  }

  async function setMemberVisibility(friendSystemId: string, memberId: string, visibility: ShareVisibility) {
    const current = sharingByFriendId[friendSystemId]?.members.find((member) => member.id === memberId);
    if (!current) return;

    const nextFieldVisibility = visibility === current.visibility
      ? current.fieldVisibility
      : defaultFieldVisibilityForLevel(visibility);

    await updateMemberSharing(friendSystemId, memberId, visibility, nextFieldVisibility);
  }

  async function setMemberFieldVisibility(
    friendSystemId: string,
    memberId: string,
    field: ShareFieldKey,
    value: boolean,
  ) {
    const current = sharingByFriendId[friendSystemId]?.members.find((member) => member.id === memberId);
    if (!current) return;

    const nextFieldVisibility: ShareFieldVisibility = {
      ...current.fieldVisibility,
      [field]: value,
    };

    await updateMemberSharing(friendSystemId, memberId, current.visibility, nextFieldVisibility);
  }

  if (loading) {
    return (
      <section className="card p-6">
        <p className="text-sm text-muted">Loading your friendships...</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card p-6 space-y-4" aria-labelledby="friends-invite-heading">
        <div>
          <h2 id="friends-invite-heading" className="text-lg font-semibold text-text">
            Invite by email
          </h2>
          <p className="text-sm text-muted mt-1">
            Send a consent-first invite to another system or singlet account.
          </p>
        </div>

        <form className="space-y-3" onSubmit={inviteFriend}>
          <div>
            <label htmlFor="friend-email" className="label">Friend email *</label>
            <input
              id="friend-email"
              type="email"
              className="input"
              placeholder="friend@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (inviteFieldError) setInviteFieldError(null);
              }}
              disabled={busy || inviting}
              maxLength={254}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          <div>
            <label htmlFor="friend-message" className="label">Invite message (optional)</label>
            <textarea
              id="friend-message"
              className="input min-h-[96px] resize-y"
              placeholder="A short warm message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (inviteFieldError) setInviteFieldError(null);
              }}
              disabled={busy || inviting}
              maxLength={280}
            />
            <p className="mt-1 text-right text-xs text-subtle">{message.length}/280</p>
          </div>

          {inviteFieldError && (
            <p className="text-xs text-error" role="alert">{inviteFieldError}</p>
          )}

          <p className="text-xs text-muted">
            Email is normalized and validated before sending.
          </p>

          <button type="submit" className="btn-primary min-h-[44px]" disabled={busy || inviting || !email.trim()}>
            {inviting ? 'Sending...' : 'Send invite'}
          </button>
        </form>
      </section>

      {alert && (
        <p
          role={alert.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-3 py-2 text-sm ${
            alert.type === 'error'
              ? 'border-error/30 bg-error/10 text-error'
              : alert.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-border bg-surface-alt text-muted'
          }`}
        >
          {alert.message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2" aria-label="Friend request status">
        <article className="card p-5">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-text">Incoming requests</h3>
            <p className="text-xs text-muted mt-1">Accept only when you feel safe and ready.</p>
          </div>

          {payload?.incomingRequests.length ? (
            <ul className="space-y-3">
              {payload.incomingRequests.map((request) => (
                <li key={request.requestId} className="rounded-xl border border-border-soft bg-surface-alt/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{request.from.name}</p>
                      <p className="text-xs text-muted">{ACCOUNT_LABEL[request.from.accountType]}</p>
                    </div>
                    <span className="text-xs text-subtle">{formatDate(request.createdAt)}</span>
                  </div>

                  {request.message && <p className="mt-2 text-xs text-muted">{request.message}</p>}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary min-h-[40px] px-3 py-2 text-sm"
                      disabled={busy}
                      onClick={() => void respond(request.requestId, 'accept')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-ghost border border-border min-h-[40px] px-3 py-2 text-sm"
                      disabled={busy}
                      onClick={() => void respond(request.requestId, 'decline')}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No incoming requests right now.</p>
          )}
        </article>

        <article className="card p-5">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-text">Outgoing requests</h3>
            <p className="text-xs text-muted mt-1">Pending invites you have sent.</p>
          </div>

          {payload?.outgoingRequests.length ? (
            <ul className="space-y-3">
              {payload.outgoingRequests.map((request) => (
                <li key={request.requestId} className="rounded-xl border border-border-soft bg-surface-alt/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{request.to.name}</p>
                      <p className="text-xs text-muted">{ACCOUNT_LABEL[request.to.accountType]}</p>
                    </div>
                    <span className="text-xs text-subtle">{formatDate(request.createdAt)}</span>
                  </div>

                  {request.message && <p className="mt-2 text-xs text-muted">{request.message}</p>}

                  <button
                    type="button"
                    className="btn-ghost border border-border min-h-[40px] px-3 py-2 text-sm mt-3"
                    disabled={busy}
                    onClick={() => void respond(request.requestId, 'cancel')}
                  >
                    Cancel request
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No pending outgoing requests.</p>
          )}
        </article>
      </section>

      <section className="card p-6" aria-labelledby="friends-list-heading">
        <div className="mb-4">
          <h2 id="friends-list-heading" className="text-lg font-semibold text-text">
            Connected friends ({payload?.friends.length ?? 0})
          </h2>
          <p className="text-sm text-muted mt-1">
            Active connections between systems and singlets in your support circle.
          </p>
        </div>

        {payload?.friends.length ? (
          <ul className="space-y-3">
            {payload.friends.map((friend) => {
              const sharing = sharingByFriendId[friend.id];

              return (
                <li key={friend.friendshipId} className="rounded-xl border border-border-soft bg-surface-alt/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-surface">
                        {friend.avatarMode === 'url' && isLikelyHttpUrl(friend.avatarUrl) ? (
                          <img src={friend.avatarUrl} alt={friend.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-base leading-none">{friend.avatarEmoji?.trim() || '☀️'}</span>
                        )}
                      </div>
                      <div>
                      <p className="text-sm font-semibold text-text">{friend.name}</p>
                      <p className="text-xs text-muted">
                        {ACCOUNT_LABEL[friend.accountType]} - Connected {formatDate(friend.connectedAt)}
                      </p>
                      {friend.description && <p className="text-xs text-subtle mt-2">{friend.description}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-ghost border border-border min-h-[38px] px-3 py-1.5 text-xs"
                        disabled={busy}
                        onClick={() => void toggleSharing(friend.id)}
                      >
                        {sharing?.open ? 'Hide privacy' : 'Privacy'}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost border border-border min-h-[38px] px-3 py-1.5 text-xs"
                        disabled={busy}
                        onClick={() => void unfriend(friend.id)}
                      >
                        Unfriend
                      </button>
                      <button
                        type="button"
                        className="btn-ghost border border-error/35 text-error min-h-[38px] px-3 py-1.5 text-xs"
                        disabled={busy}
                        onClick={() => void blockAccount(friend.id)}
                      >
                        Block
                      </button>
                    </div>
                  </div>

                  {sharing?.open && (
                    <div className="mt-3 rounded-lg border border-border-soft bg-surface/70 p-3">
                      <p className="text-xs font-semibold text-text mb-2">Per-member sharing visibility</p>
                      <p className="text-xs text-muted mb-3">
                        Choose what this friend can view for each member.
                      </p>

                      {sharing.loading && <p className="text-xs text-muted">Loading sharing settings...</p>}
                      {sharing.error && <p className="text-xs text-error">{sharing.error}</p>}

                      {!sharing.loading && !sharing.error && sharing.members.length === 0 && (
                        <p className="text-xs text-muted">No members yet. Add members to configure sharing.</p>
                      )}

                      {!sharing.loading && !sharing.error && sharing.members.length > 0 && (
                        <ul className="space-y-2">
                          {sharing.members.map((member) => {
                            const shareKey = `${friend.id}:${member.id}`;
                            const isSaving = savingShareKey === shareKey;

                            return (
                              <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-soft px-2 py-2">
                                <div>
                                  <p className="text-xs font-medium text-text">{member.name}</p>
                                  <p className="text-[11px] text-subtle">
                                    {member.isArchived ? 'Archived member' : 'Active member'}
                                  </p>
                                </div>

                                <div className="w-full space-y-2 md:w-auto md:min-w-[320px]">
                                  <select
                                    className="input h-10 w-full text-xs"
                                    value={member.visibility}
                                    disabled={isSaving || busy}
                                    onChange={(e) => void setMemberVisibility(friend.id, member.id, e.target.value as ShareVisibility)}
                                    aria-label={`Sharing visibility for ${member.name}`}
                                  >
                                    {VISIBILITY_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {VISIBILITY_LABEL[option]}
                                      </option>
                                    ))}
                                  </select>

                                  {member.visibility !== 'hidden' && (
                                    <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border-soft bg-surface-alt/60 p-2">
                                      {FIELD_KEYS.map((fieldKey) => (
                                        <label key={fieldKey} className="flex items-center gap-2 text-[11px] text-muted">
                                          <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 accent-primary"
                                            checked={member.fieldVisibility[fieldKey]}
                                            disabled={isSaving || busy}
                                            onChange={(e) => void setMemberFieldVisibility(friend.id, member.id, fieldKey, e.target.checked)}
                                          />
                                          <span>{FIELD_LABEL[fieldKey]}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No friendships yet. Start by sending your first invitation.
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Block status">
        <article className="card p-5">
          <h3 className="text-base font-semibold text-text">Blocked by you</h3>
          <p className="text-xs text-muted mt-1">You can unblock any time.</p>

          {payload?.blocks.blockedByMe.length ? (
            <ul className="mt-3 space-y-2">
              {payload.blocks.blockedByMe.map((entry) => (
                <li key={entry.blockId} className="rounded-lg border border-border-soft bg-surface-alt/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-text">{entry.system.name}</p>
                      <p className="text-xs text-muted">{ACCOUNT_LABEL[entry.system.accountType]}</p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost border border-border min-h-[34px] px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => void unblockAccount(entry.system.id)}
                    >
                      Unblock
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted mt-2">No blocked accounts.</p>
          )}
        </article>

        <article className="card p-5">
          <h3 className="text-base font-semibold text-text">Accounts blocking you</h3>
          <p className="text-xs text-muted mt-1">These accounts cannot receive your invites right now.</p>

          {payload?.blocks.blockedMe.length ? (
            <ul className="mt-3 space-y-2">
              {payload.blocks.blockedMe.map((entry) => (
                <li key={entry.blockId} className="rounded-lg border border-border-soft bg-surface-alt/50 px-3 py-2">
                  <p className="text-sm font-medium text-text">{entry.system.name}</p>
                  <p className="text-xs text-muted">{ACCOUNT_LABEL[entry.system.accountType]}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted mt-2">No one is blocking your account.</p>
          )}
        </article>
      </section>

      <p className="text-xs text-subtle">
        Account: {payload?.account.name ?? 'Unknown'} ({payload ? ACCOUNT_LABEL[payload.account.accountType] : '-'}) - Pending requests: {totalPending}
      </p>
    </div>
  );
}

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { success: false, error: 'Unexpected server response.' };
  }
  return res.json();
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isLikelyEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isLikelyHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function defaultFieldVisibilityForLevel(visibility: ShareVisibility): ShareFieldVisibility {
  if (visibility === 'full') {
    return {
      pronouns: true,
      description: true,
      avatarUrl: true,
      color: true,
      role: true,
      tags: true,
      notes: true,
    };
  }

  if (visibility === 'hidden') {
    return {
      pronouns: false,
      description: false,
      avatarUrl: false,
      color: false,
      role: false,
      tags: false,
      notes: false,
    };
  }

  return {
    pronouns: true,
    description: true,
    avatarUrl: true,
    color: true,
    role: true,
    tags: true,
    notes: false,
  };
}
