import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { partnershipNotes } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string; noteId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId, noteId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  let body: any;
  try { body = await request.json(); } catch { return err('Invalid JSON payload', 400); }
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) return err('Content is required.', 400);
  const mood = typeof body?.mood === 'string' ? body.mood.trim() || null : null;

  const [updated] = await db.update(partnershipNotes)
    .set({ content, mood, updatedAt: new Date() })
    .where(and(
      eq(partnershipNotes.id, noteId),
      eq(partnershipNotes.partnershipId, partnershipId),
      eq(partnershipNotes.authorSystemId, auth.systemId),
    ))
    .returning();

  if (!updated) return err('Note not found.', 404);
  revalidatePath(`/partners/${partnershipId}`);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId, noteId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const deleted = await db.delete(partnershipNotes)
    .where(and(
      eq(partnershipNotes.id, noteId),
      eq(partnershipNotes.partnershipId, partnershipId),
      eq(partnershipNotes.authorSystemId, auth.systemId),
    ))
    .returning();

  if (!deleted.length) return err('Note not found.', 404);
  revalidatePath(`/partners/${partnershipId}`);
  return ok({ deleted: true });
}
