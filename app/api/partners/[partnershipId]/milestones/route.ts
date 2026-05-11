import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { partnershipMilestones } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem, parseOptionalDate } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const items = await db.query.partnershipMilestones.findMany({
    where: eq(partnershipMilestones.partnershipId, partnershipId),
    orderBy: (m, { desc }) => [desc(m.occurredOn)],
  });
  return ok(items);
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  let body: any;
  try { body = await request.json(); } catch { return err('Invalid JSON payload', 400); }
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const occurredOn = parseOptionalDate(body?.occurredOn);
  if (!title) return err('Title is required.', 400);
  if (!occurredOn) return err('Valid occurredOn date is required.', 400);

  const description = typeof body?.description === 'string' ? body.description.trim() || null : null;

  const [created] = await db.insert(partnershipMilestones).values({
    id: createId(),
    partnershipId,
    title,
    description,
    occurredOn,
    createdAt: new Date(),
  }).returning();

  revalidatePath(`/partners/${partnershipId}`);
  return ok(created, 201);
}
