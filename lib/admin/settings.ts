import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';

// Known setting keys. Values are stored as JSON strings.
export const SETTING_KEYS = {
  maintenanceMode: 'maintenance_mode',
  maintenanceMessage: 'maintenance_message',
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, key),
    columns: { value: true },
  });
  return row?.value ?? null;
}

export async function setSetting(
  key: string,
  value: string | null,
  updatedBySystemId?: string | null,
): Promise<void> {
  const now = new Date();
  await db
    .insert(appSettings)
    .values({ key, value, updatedBySystemId: updatedBySystemId ?? null, updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedBySystemId: updatedBySystemId ?? null, updatedAt: now },
    });
}

export async function isMaintenanceMode(): Promise<boolean> {
  return (await getSetting(SETTING_KEYS.maintenanceMode)) === 'true';
}

export async function getMaintenanceState(): Promise<{ enabled: boolean; message: string | null }> {
  const [enabled, message] = await Promise.all([
    getSetting(SETTING_KEYS.maintenanceMode),
    getSetting(SETTING_KEYS.maintenanceMessage),
  ]);
  return { enabled: enabled === 'true', message };
}
