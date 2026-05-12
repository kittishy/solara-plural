import { db } from '@/lib/db';
import { systemNotes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';

// GET /api/notes
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const notes = await db.query.systemNotes.findMany({
    columns: {
      id: true,
      title: true,
      content: true,
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

  const now = new Date();
  const note = await db.insert(systemNotes).values({
    id:        createId(),
    systemId:  auth.systemId,
    memberId:  typeof body.memberId === 'string' ? body.memberId : null,
    title:     typeof body.title === 'string' ? body.title.trim() || null : null,
    content,
    isPrivate: body.isPrivate === true ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/notes');

  return ok(note[0], 201);
}
