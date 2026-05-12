import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { partnershipBucketItems } from '@/lib/db/schema';
import { err, ok, parseJsonRecord, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const items = await db.query.partnershipBucketItems.findMany({
    where: eq(partnershipBucketItems.partnershipId, partnershipId),
    orderBy: (b, { asc, desc }) => [asc(b.completedAt), desc(b.createdAt)],
  });
  return ok(items);
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return err('Title is required.', 400);
  const note = typeof body?.note === 'string' ? body.note.trim() || null : null;
  const category = typeof body?.category === 'string' ? body.category.trim() || null : null;

  const now = new Date();
  const [created] = await db.insert(partnershipBucketItems).values({
    id: createId(),
    partnershipId,
    title,
    note,
    category,
    completedAt: null,
    createdBySystemId: auth.systemId,
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath(`/partners/${partnershipId}`);
  return ok(created, 201);
}
