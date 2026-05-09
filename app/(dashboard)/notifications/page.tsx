import NotificationsClient from './NotificationsClient';

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Notifications</h1>
        <p className="mt-0.5 text-sm text-muted">
          Friend front updates, with push as an optional companion.
        </p>
      </div>

      <NotificationsClient />
    </div>
  );
}

