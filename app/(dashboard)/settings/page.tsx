import { db } from '@/lib/db';
import { memberExternalLinks, systemIntegrations, systems } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
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
      deletionRequestedAt: true,
      deletionScheduledFor: true,
      createdAt: true,
      updatedAt: true,
    },
    where: eq(systems.id, systemId),
  });

  let pluralKitConnection: {
    linkedMembers: number;
    hasLinkedMembers: boolean;
    hasSavedToken: boolean;
    lastSyncedAt: string | null;
  } = {
    linkedMembers: 0,
    hasLinkedMembers: false,
    hasSavedToken: false,
    lastSyncedAt: null,
  };

  try {
    const [pluralKitLinkStats] = await db
      .select({
        linkedMembers: sql<number>`count(*)`,
        lastSyncedAt: sql<number | null>`max(${memberExternalLinks.lastSyncedAt})`,
      })
      .from(memberExternalLinks)
      .where(and(
        eq(memberExternalLinks.systemId, systemId),
        eq(memberExternalLinks.provider, 'pluralkit'),
      ));

    const savedPluralKitToken = await db.query.systemIntegrations.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(systemIntegrations.systemId, systemId),
        eq(systemIntegrations.provider, 'pluralkit'),
      ),
    });

    const linkedMembers = Number(pluralKitLinkStats?.linkedMembers ?? 0);
    pluralKitConnection = {
      linkedMembers,
      hasLinkedMembers: linkedMembers > 0,
      hasSavedToken: Boolean(savedPluralKitToken),
      lastSyncedAt: pluralKitLinkStats?.lastSyncedAt
        ? new Date(pluralKitLinkStats.lastSyncedAt * 1000).toISOString()
        : null,
    };
  } catch {
    // Some local environments may be temporarily out-of-sync with integration migrations.
    // Keep Settings available and hide persisted integration status until schema is ready.
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text"><Trans k="pages.settingsTitle" /></h1>
        <p className="text-muted text-sm mt-0.5"><Trans k="pages.settingsSubtitle" /></p>
      </div>
      <SettingsClient system={system ?? null} pluralKitConnection={pluralKitConnection} />
    </div>
  );
}
