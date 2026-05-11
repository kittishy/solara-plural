import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { alterPartnerPairings } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string; pairingId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId, pairingId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const deleted = await db.delete(alterPartnerPairings)
    .where(and(
      eq(alterPartnerPairings.id, pairingId),
      eq(alterPartnerPairings.partnershipId, partnershipId),
    ))
    .returning();

  if (!deleted.length) return err('Pairing not found.', 404);
  revalidatePath(`/partners/${partnershipId}`);
  return ok({ deleted: true });
}
