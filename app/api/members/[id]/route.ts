import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

// Next.js 14 App Router: params is now a Promise — must be awaited in route handlers
type Params = { params: Promise<{ id: string }> };

// GET /api/members/[id]
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const member = await db.query.members.findFirst({
    where: and(eq(members.id, id), eq(members.systemId, auth.systemId)),
  });

  if (!member) return err('Member not found', 404);
  return ok({ ...member, tags: member.tags ? JSON.parse(member.tags) : [] });
}

// PUT /api/members/[id]
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { name, pronouns, avatarUrl, description, color, role, tags, notes } = body;

  if (!name?.trim()) return err('Name is required');

  const updated = await db.update(members)
    .set({
      name:        name.trim(),
      pronouns:    pronouns ?? null,
      avatarUrl:   avatarUrl ?? null,
      description: description ?? null,
      color:       color ?? null,
      role:        role ?? null,
      tags:        tags ? JSON.stringify(tags) : null,
      notes:       notes ?? null,
      updatedAt:   new Date(),
    })
    .where(and(eq(members.id, id), eq(members.systemId, auth.systemId)))
    .returning();

  if (!updated.length) return err('Member not found', 404);
  revalidatePath('/');
  revalidatePath('/members');
  revalidatePath('/front');
  revalidatePath(`/members/${id}`);
  return ok({ ...updated[0], tags: tags ?? [] });
}

// DELETE /api/members/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const deleted = await db.delete(members)
    .where(and(eq(members.id, id), eq(members.systemId, auth.systemId)))
    .returning();

  if (!deleted.length) return err('Member not found', 404);
  revalidatePath('/');
  revalidatePath('/members');
  revalidatePath('/front');
  revalidatePath(`/members/${id}`);
  return ok({ deleted: true });
}
