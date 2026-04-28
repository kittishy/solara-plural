import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import SettingsClient from './SettingsClient';
import { requireSystemId } from '@/lib/auth/session';
import { Trans } from '@/components/language/Trans';

export default async function SettingsPage() {
  const systemId = await requireSystemId();

  const system = await db.query.systems.findFirst({
    columns: {
      id: true,
      name: true,
      email: true,
      description: true,
      accountType: true,
      avatarMode: true,
      avatarEmoji: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    where: eq(systems.id, systemId),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text"><Trans k="pages.settingsTitle" /></h1>
        <p className="text-muted text-sm mt-0.5"><Trans k="pages.settingsSubtitle" /></p>
      </div>
      <SettingsClient system={system ?? null} />
    </div>
  );
}
