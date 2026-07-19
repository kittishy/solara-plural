import { db } from '@/lib/db';
import { systemNotes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';
import { resolveOptionalOwnedMemberId } from '@/lib/api/member-ownership';
import { CAPS, firstCapViolation } from '@/lib/api/validate';

// GET /api/notes
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const notes = await db.query.systemNotes.findMany({
    columns: {
      id: true,
      title: true,
      content: true,
      memberId: true,
      category: true,
      isPrivate: true,
      updatedAt: true,
    },
    where: eq(systemNotes.systemId, auth.systemId),
    orderBy: (n, { desc }) => [desc(n.updatedAt)],
  });

  return ok(notes, 200, {
    headers: {
      'Cache-Control': 'private, max-age=0, s-maxage=30, stale-while-revalidate=120',
    },
  });
}

// POST /api/notes
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return err('Content is required');

  const capError = firstCapViolation([
    { label: 'Title', value: body.title, max: CAPS.noteTitle },
    { label: 'Content', value: content, max: CAPS.noteContent },
    { label: 'Category', value: body.category, max: CAPS.noteCategory },
  ]);
  if (capError) return err(capError);

  const member = await resolveOptionalOwnedMemberId(auth.systemId, body.memberId);
  if (!member.ok) return err(member.error, 400);

  const now = new Date();
  const note = await db.insert(systemNotes).values({
    id:        createId(),
    systemId:  auth.systemId,
    memberId:  member.memberId,
    title:     typeof body.title === 'string' ? body.title.trim() || null : null,
    content,
    category:  typeof body.category === 'string' ? body.category : null,
    isPrivate: body.isPrivate === true ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/notes');

  return ok(note[0], 201);
}
