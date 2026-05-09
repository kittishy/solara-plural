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
  if (permission === 'denied') return 'Blocked';
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

  const statusTone = useMemo(() => {
    if (permission === 'granted') return 'text-success';
    if (permission === 'denied') return 'text-error';
    return 'text-muted';
  }, [permission]);

  async function enablePush() {
    setIsEnablingPush(true);
    setPushStatus(null);
    const result = await requestAndSavePushToken();
    setPermission(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
    setPushStatus(result.success ? 'Push notifications are ready on this device.' : 'Could not enable push notifications on this device.');
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
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Push notifications</h2>
            <p className="mt-1 text-sm text-muted">
              Optional alerts for friend front changes. The notification center below stays available even without push.
            </p>
            <p className={`mt-2 text-sm font-medium ${statusTone}`}>Status: {permissionLabel(permission)}</p>
            {pushStatus && <p className="mt-2 text-sm text-muted">{pushStatus}</p>}
          </div>

          <button
            type="button"
            onClick={enablePush}
            disabled={!canEnablePush || isEnablingPush}
            className="btn-primary min-h-[44px] justify-center px-5"
          >
            {isEnablingPush ? 'Enabling...' : permission === 'granted' ? 'Enabled' : 'Enable push'}
          </button>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Notification center</h2>
            <p className="text-sm text-muted">{unreadCount} unread</p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="btn-ghost min-h-[44px] border border-border/60"
          >
            Mark all read
          </button>
        </div>

        {isLoading && <p className="text-sm text-muted">Loading notifications...</p>}
        {error && <p role="alert" className="text-sm text-error">Could not load notifications.</p>}
        {!isLoading && notifications.length === 0 && (
          <p className="rounded-xl border border-border/50 bg-surface-alt p-4 text-sm text-muted">
            Front updates from friends will appear here.
          </p>
        )}

        <div className="space-y-3">
          {notifications.map((notification) => {
            const createdAt = new Date(notification.createdAt);
            const isUnread = !notification.readAt;

            return (
              <article
                key={notification.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isUnread ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-surface-alt/40'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text">{notification.title}</p>
                    <p className="mt-1 text-sm text-muted">{notification.body}</p>
                    <p className="mt-2 text-xs text-subtle">
                      {formatDate(createdAt, { month: 'short', day: 'numeric' })} at {formatTime(createdAt, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className="btn-ghost min-h-[40px] shrink-0 border border-border/60 px-3 py-1.5 text-xs"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

