import { db } from '@/lib/db';
import { memberRelationships } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string; relId: string }> };

// DELETE /api/members/[id]/relationships/[relId]
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id, relId } = await params;

  // Only allow deletion if the member is one of the endpoints
  const rel = await db.query.memberRelationships.findFirst({
    where: and(
      eq(memberRelationships.id, relId),
      eq(memberRelationships.systemId, auth.systemId),
      or(
        eq(memberRelationships.fromMemberId, id),
        eq(memberRelationships.toMemberId, id)
      )
    ),
  });

  if (!rel) return err('Relationship not found', 404);

  await db.delete(memberRelationships).where(eq(memberRelationships.id, relId));

  revalidatePath(`/members/${rel.fromMemberId}`);
  revalidatePath(`/members/${rel.toMemberId}`);
  return ok({ deleted: true });
}
