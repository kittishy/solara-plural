'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { apiFetcher, swrKeys } from '@/lib/swr';
import { requestAndSavePushToken } from '@/lib/notifications/browser';
import { useLanguage } from '@/components/providers/LanguageProvider';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | Date | null;
  createdAt: string | Date;
};

type NotificationsPayload = {
  notifications: NotificationItem[];
  unreadCount: number;
};

function permissionLabel(permission: NotificationPermission | 'unsupported') {
  if (permission === 'granted') return 'Enabled';
  if (permission === 'denied') return 'Blocked by browser';
  if (permission === 'default') return 'Not enabled';
  return 'Unsupported';
}

export default function NotificationsClient() {
  const { formatDate, formatTime } = useLanguage();
  const { data, error, isLoading, mutate } = useSWR<NotificationsPayload>(swrKeys.notifications, apiFetcher);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => (
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  ));
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const canEnablePush = permission !== 'granted' && permission !== 'denied' && permission !== 'unsupported';

  const statusDot = useMemo(() => {
    if (permission === 'granted') return 'bg-success';
    if (permission === 'denied') return 'bg-error';
    return 'bg-muted';
  }, [permission]);

  async function enablePush() {
    setIsEnablingPush(true);
    setPushStatus(null);
    const result = await requestAndSavePushToken();
    setPermission(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
    setPushStatus(
      result.success
        ? 'Push notifications are ready on this device.'
        : 'Could not enable push notifications on this device.'
    );
    setIsEnablingPush(false);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    void mutate();
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      credentials: 'same-origin',
    });
    void mutate();
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Notifications</h1>
          <p className="text-muted text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="btn-ghost min-h-[44px] border border-border/60 disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>

      {/* Push notifications slim bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 ${statusDot}`}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-text">Push notifications</span>
          <span className="text-subtle text-xs" aria-hidden="true">·</span>
          <span className="text-muted text-xs truncate">{permissionLabel(permission)}</span>
        </div>
        {canEnablePush && (
          <button
            type="button"
            onClick={enablePush}
            disabled={isEnablingPush}
            className="flex-shrink-0 rounded-lg border border-border/60 px-3 py-1 text-xs font-medium text-muted
              transition-colors hover:border-border hover:text-text disabled:opacity-50"
          >
            {isEnablingPush ? 'Enabling…' : 'Enable push'}
          </button>
        )}
      </div>
      {pushStatus && (
        <p className="text-sm text-muted px-1">{pushStatus}</p>
      )}

      {/* Notification list */}
      {isLoading && (
        <div className="rounded-xl overflow-hidden border border-border/40">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-none border-b border-border/30 last:border-0" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-error px-1">Could not load notifications.</p>
      )}

      {!isLoading && !error && notifications.length === 0 && (
        <div className="card p-10 text-center animate-fade-in">
          <p className="text-text font-semibold">No notifications yet</p>
          <p className="text-muted text-sm mt-2">
            Front updates from friends will appear here.
          </p>
        </div>
      )}

      {!isLoading && notifications.length > 0 && (
        <ul role="list" className="rounded-xl overflow-hidden border border-border/40">
          {notifications.map((notification) => {
            const createdAt = new Date(notification.createdAt);
            const isUnread = !notification.readAt;

            return (
              <li
                key={notification.id}
                role="listitem"
                className={`relative border-b border-border/40 last:border-b-0 transition-colors duration-150
                  ${isUnread ? 'bg-primary/5' : 'bg-surface hover:bg-surface-alt/60'}`}
                style={{ borderLeft: `3px solid ${isUnread ? '#a78bfa' : 'transparent'}` }}
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-start gap-3 min-w-0">
                    {isUnread && (
                      <span
                        className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0"
                        aria-label="Unread"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text leading-snug">{notification.title}</p>
                      <p className="text-xs text-muted mt-0.5 leading-snug">{notification.body}</p>
                      <p className="text-xs text-subtle mt-1">
                        {formatDate(createdAt, { month: 'short', day: 'numeric' })} at{' '}
                        {formatTime(createdAt, { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className="flex-shrink-0 rounded-lg border border-border/60 px-3 py-1 text-xs font-medium text-muted
                        transition-colors hover:border-border hover:text-text"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
