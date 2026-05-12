import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';
import { readMemberCustomFieldValues, saveMemberCustomFieldValues } from '@/lib/member-custom-fields';
import { parseStoredTags, readOptionalString, readTags } from '@/lib/members/fields';

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
  const customFieldValues = await readMemberCustomFieldValues(auth.systemId, id);
  return ok({ ...member, tags: parseStoredTags(member.tags), customFieldValues });
}

// PUT /api/members/[id]
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const tags = readTags(body.tags);

  if (!name) return err('Name is required');
  if (!tags) return err('tags must be an array of strings');

  const updated = await db.update(members)
    .set({
      name,
      pronouns:    readOptionalString(body.pronouns),
      avatarUrl:   readOptionalString(body.avatarUrl),
      description: readOptionalString(body.description),
      color:       readOptionalString(body.color),
      role:        readOptionalString(body.role),
      tags:        tags.length > 0 ? JSON.stringify(tags) : null,
      notes:       readOptionalString(body.notes),
      updatedAt:   new Date(),
    })
    .where(and(eq(members.id, id), eq(members.systemId, auth.systemId)))
    .returning();

  if (!updated.length) return err('Member not found', 404);
  const savedCustomFieldValues = await saveMemberCustomFieldValues(auth.systemId, id, body.customFieldValues);
  revalidatePath('/');
  revalidatePath('/members');
  revalidatePath('/front');
  revalidatePath(`/members/${id}`);
  return ok({ ...updated[0], tags, customFieldValues: savedCustomFieldValues });
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
