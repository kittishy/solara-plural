import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { partnershipNotes } from '@/lib/db/schema';
import { err, ok, parseJsonRecord, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const notes = await db.query.partnershipNotes.findMany({
    where: eq(partnershipNotes.partnershipId, partnershipId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });
  return ok(notes);
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
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) return err('Content is required.', 400);
  const mood = typeof body?.mood === 'string' ? body.mood.trim() || null : null;

  const now = new Date();
  const [created] = await db.insert(partnershipNotes).values({
    id: createId(),
    partnershipId,
    authorSystemId: auth.systemId,
    content,
    mood,
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath(`/partners/${partnershipId}`);
  return ok(created, 201);
}
