import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { alterPartnerPairings, members } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const pairings = await db.query.alterPartnerPairings.findMany({
    where: eq(alterPartnerPairings.partnershipId, partnershipId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
  return ok(pairings);
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  let body: any;
  try { body = await request.json(); } catch { return err('Invalid JSON payload', 400); }
  const memberAId = typeof body?.memberAId === 'string' ? body.memberAId : '';
  const memberBId = typeof body?.memberBId === 'string' ? body.memberBId : '';
  if (!memberAId || !memberBId) return err('memberAId and memberBId are required.', 400);

  const found = await db.query.members.findMany({
    columns: { id: true, systemId: true },
    where: inArray(members.id, [memberAId, memberBId]),
  });
  if (found.length !== 2) return err('Members not found.', 404);

  const aOwner = found.find((m) => m.id === memberAId)?.systemId;
  const bOwner = found.find((m) => m.id === memberBId)?.systemId;
  const validSystems = [access.partnership.systemAId, access.partnership.systemBId];
  if (!aOwner || !bOwner || !validSystems.includes(aOwner) || !validSystems.includes(bOwner)) {
    return err('Both members must belong to systems in this partnership.', 400);
  }
  if (aOwner === bOwner) {
    return err('Pairings must connect members from each partner system.', 400);
  }

  const now = new Date();
  const [created] = await db.insert(alterPartnerPairings).values({
    id: createId(),
    partnershipId,
    memberAId,
    memberBId,
    label: typeof body?.label === 'string' ? body.label.trim() || null : null,
    createdAt: now,
  }).returning();

  revalidatePath(`/partners/${partnershipId}`);
  return ok(created, 201);
}
