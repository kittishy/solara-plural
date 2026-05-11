import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { partnershipMilestones } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string; milestoneId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId, milestoneId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const deleted = await db.delete(partnershipMilestones)
    .where(and(
      eq(partnershipMilestones.id, milestoneId),
      eq(partnershipMilestones.partnershipId, partnershipId),
    ))
    .returning();

  if (!deleted.length) return err('Milestone not found.', 404);
  revalidatePath(`/partners/${partnershipId}`);
  return ok({ deleted: true });
}
