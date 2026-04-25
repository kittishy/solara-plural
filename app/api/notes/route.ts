import { db } from '@/lib/db';
import { systemNotes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';

// GET /api/notes
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const notes = await db.query.systemNotes.findMany({
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

  const body = await request.json();
  const { title, content, memberId } = body;

  if (!content?.trim()) return err('Content is required');

  const now = new Date();
  const note = await db.insert(systemNotes).values({
    id:        createId(),
    systemId:  auth.systemId,
    memberId:  memberId ?? null,
    title:     title?.trim() ?? null,
    content:   content.trim(),
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/notes');

  return ok(note[0], 201);
}
