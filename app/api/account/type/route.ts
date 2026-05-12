import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { requireAuth, err, ok, parseJsonRecord } from '@/lib/api/helpers';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type AccountType = 'system' | 'singlet';

function parseAccountType(value: unknown): AccountType | null {
  if (value === 'system' || value === 'singlet') return value;
  return null;
}

// PUT /api/account/type
// Body: { accountType: "system" | "singlet", acknowledgeDataRisk?: boolean }
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const accountType = parseAccountType(body.accountType);
  if (!accountType) {
    return err('Invalid account type. Use "system" or "singlet".', 400);
  }

  const current = await db.query.systems.findFirst({
    columns: { accountType: true },
    where: eq(systems.id, auth.systemId),
  });

  if (!current) {
    return err('Account not found.', 404);
  }

  const acknowledgeDataRisk = Boolean(body.acknowledgeDataRisk);
  const isDowngradingToSinglet = current.accountType !== 'singlet' && accountType === 'singlet';
  if (isDowngradingToSinglet && !acknowledgeDataRisk) {
    return err('Changing a system account to singlet requires acknowledging the data risk.', 400);
  }

  const updated = await db
    .update(systems)
    .set({ accountType, updatedAt: new Date() })
    .where(eq(systems.id, auth.systemId))
    .returning({
      id: systems.id,
      name: systems.name,
      email: systems.email,
      accountType: systems.accountType,
      updatedAt: systems.updatedAt,
    });

  if (!updated.length) {
    return err('Account not found.', 404);
  }

  revalidatePath('/');
  revalidatePath('/settings');
  revalidatePath('/friends');

  return ok(updated[0]);
}
