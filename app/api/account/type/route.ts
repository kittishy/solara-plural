import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { requireAuth, err, ok } from '@/lib/api/helpers';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type AccountType = 'system' | 'singlet';

function parseAccountType(value: unknown): AccountType | null {
  if (value === 'system' || value === 'singlet') return value;
  return null;
}

// PUT /api/account/type
// Body: { accountType: "system" | "singlet" }
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON payload.', 400);
  }

  const accountType = parseAccountType((body as { accountType?: unknown })?.accountType);
  if (!accountType) {
    return err('Invalid account type. Use "system" or "singlet".', 400);
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
