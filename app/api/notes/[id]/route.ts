import { db } from '@/lib/db';
import { systemNotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const note = await db.query.systemNotes.findFirst({
    where: and(eq(systemNotes.id, params.id), eq(systemNotes.systemId, auth.systemId)),
  });

  if (!note) return err('Note not found', 404);
  return ok(note);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { title, content, memberId } = await request.json();
  if (!content?.trim()) return err('Content is required');

  const updated = await db.update(systemNotes)
    .set({ title: title?.trim() ?? null, content: content.trim(), memberId: memberId ?? null, updatedAt: new Date() })
    .where(and(eq(systemNotes.id, params.id), eq(systemNotes.systemId, auth.systemId)))
    .returning();

  if (!updated.length) return err('Note not found', 404);
  revalidatePath('/');
  revalidatePath('/notes');
  revalidatePath(`/notes/${params.id}`);
  return ok(updated[0]);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const deleted = await db.delete(systemNotes)
    .where(and(eq(systemNotes.id, params.id), eq(systemNotes.systemId, auth.systemId)))
    .returning();

  if (!deleted.length) return err('Note not found', 404);
  revalidatePath('/');
  revalidatePath('/notes');
  revalidatePath(`/notes/${params.id}`);
  return ok({ deleted: true });
}
