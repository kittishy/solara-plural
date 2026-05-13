import { db } from '@/lib/db';
import { systemNotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const note = await db.query.systemNotes.findFirst({
    where: and(eq(systemNotes.id, id), eq(systemNotes.systemId, auth.systemId)),
  });

  if (!note) return err('Note not found', 404);
  return ok(note);
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

  const updated = await db.update(systemNotes)
    .set({
      title: typeof body.title === 'string' ? body.title.trim() || null : null,
      content,
      memberId: typeof body.memberId === 'string' ? body.memberId : null,
      isPrivate: typeof body.isPrivate === 'boolean' ? (body.isPrivate ? 1 : 0) : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(systemNotes.id, id), eq(systemNotes.systemId, auth.systemId)))
    .returning();

  if (!updated.length) return err('Note not found', 404);
  revalidatePath('/');
  revalidatePath('/notes');
  revalidatePath(`/notes/${id}`);
  return ok(updated[0]);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const deleted = await db.delete(systemNotes)
    .where(and(eq(systemNotes.id, id), eq(systemNotes.systemId, auth.systemId)))
    .returning();

  if (!deleted.length) return err('Note not found', 404);
  revalidatePath('/');
  revalidatePath('/notes');
  revalidatePath(`/notes/${id}`);
  return ok({ deleted: true });
}
