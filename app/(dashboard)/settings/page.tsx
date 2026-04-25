import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import SettingsClient from './SettingsClient';
import { requireSystemId } from '@/lib/auth/session';

export default async function SettingsPage() {
  const systemId = await requireSystemId();

  const system = await db.query.systems.findFirst({
    columns: {
      id: true,
      name: true,
      email: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    where: eq(systems.id, systemId),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-muted text-sm mt-0.5">Manage your system profile and data</p>
      </div>
      <SettingsClient system={system ?? null} />
    </div>
  );
}
