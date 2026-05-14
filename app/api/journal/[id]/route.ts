import { db } from '@/lib/db';
import { systemJournal } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const entry = await db.query.systemJournal.findFirst({
    where: and(eq(systemJournal.id, id), eq(systemJournal.systemId, auth.systemId)),
  });

  if (!entry) return err('Entry not found', 404);
  return ok({ entry });
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return err('Content is required');

  const frontingMemberIds =
    Array.isArray(body.frontingMemberIds) && body.frontingMemberIds.every((v: unknown) => typeof v === 'string')
      ? JSON.stringify(body.frontingMemberIds)
      : null;

  const updated = await db.update(systemJournal)
    .set({
      title:             typeof body.title === 'string' ? body.title.trim() || null : null,
      content,
      mood:              typeof body.mood === 'string' ? body.mood : null,
      frontingMemberIds,
      isPrivate:         typeof body.isPrivate === 'boolean' ? (body.isPrivate ? 1 : 0) : undefined,
      updatedAt:         new Date(),
    })
    .where(and(eq(systemJournal.id, id), eq(systemJournal.systemId, auth.systemId)))
    .returning();

  if (!updated.length) return err('Entry not found', 404);

  revalidatePath('/');
  revalidatePath('/journal');
  revalidatePath(`/journal/${id}`);

  return ok({ entry: updated[0] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const deleted = await db.delete(systemJournal)
    .where(and(eq(systemJournal.id, id), eq(systemJournal.systemId, auth.systemId)))
    .returning();

  if (!deleted.length) return err('Entry not found', 404);

  revalidatePath('/');
  revalidatePath('/journal');

  return ok({ deleted: true });
}
