import { ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { requireAdminApi } from '@/lib/auth/admin';
import { getMaintenanceState, setSetting, SETTING_KEYS } from '@/lib/admin/settings';
import { recordAudit } from '@/lib/admin/audit';

// GET /api/admin/settings — current operational settings (maintenance mode).
export async function GET() {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const maintenance = await getMaintenanceState();
  return ok({ maintenance });
}

// PUT /api/admin/settings — update maintenance mode and message.
export async function PUT(request: Request) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const changed: Record<string, unknown> = {};

  if (typeof body.maintenanceEnabled === 'boolean') {
    await setSetting(SETTING_KEYS.maintenanceMode, body.maintenanceEnabled ? 'true' : 'false', gate.admin.systemId);
    changed.maintenanceEnabled = body.maintenanceEnabled;
  }

  if (typeof body.maintenanceMessage === 'string') {
    const message = body.maintenanceMessage.trim();
    await setSetting(SETTING_KEYS.maintenanceMessage, message || null, gate.admin.systemId);
    changed.maintenanceMessage = message;
  }

  if (Object.keys(changed).length === 0) return err('No supported settings to update', 400);

  await recordAudit({
    actorSystemId: gate.admin.systemId,
    actorEmail: gate.admin.email,
    action: 'settings.update',
    targetType: 'app_settings',
    metadata: changed,
  });

  const maintenance = await getMaintenanceState();
  return ok({ maintenance });
}
