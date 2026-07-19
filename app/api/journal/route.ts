import { db } from '@/lib/db';
import { systemJournal } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { CAPS, firstCapViolation } from '@/lib/api/validate';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';
import { resolveOwnedMemberIds } from '@/lib/api/member-ownership';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const entries = await db.query.systemJournal.findMany({
    columns: {
      id: true,
      title: true,
      content: true,
      mood: true,
      createdAt: true,
    },
    where: eq(systemJournal.systemId, auth.systemId),
    orderBy: [desc(systemJournal.createdAt)],
    limit: 50,
  });

  return ok(entries, 200, {
    headers: {
      'Cache-Control': 'private, max-age=0, s-maxage=30, stale-while-revalidate=120',
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return err('Content is required');

  const capError = firstCapViolation([
    { label: 'Title', value: body.title, max: CAPS.journalTitle },
    { label: 'Content', value: content, max: CAPS.journalContent },
  ]);
  if (capError) return err(capError);


  const frontingMembers = await resolveOwnedMemberIds(auth.systemId, body.frontingMemberIds, 'frontingMemberIds');
  if (!frontingMembers.ok) return err(frontingMembers.error, 400);

  const frontingMemberIds = frontingMembers.memberIds.length > 0
    ? JSON.stringify(frontingMembers.memberIds)
    : null;

  const now = new Date();
  const entry = await db.insert(systemJournal).values({
    id:                createId(),
    systemId:          auth.systemId,
    title:             typeof body.title === 'string' ? body.title.trim() || null : null,
    content,
    mood:              typeof body.mood === 'string' ? body.mood : null,
    frontingMemberIds,
    isPrivate:         body.isPrivate === true ? 1 : 0,
    createdAt:         now,
    updatedAt:         now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/journal');

  return ok({ entry: entry[0] }, 201);
}
