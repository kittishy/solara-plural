import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';
import { saveMemberCustomFieldValues } from '@/lib/member-custom-fields';
import { parseStoredTags, readOptionalString, readTags } from '@/lib/members/fields';

// GET /api/members — list all members for current system
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '60', 10) || 60, 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);

  const where = and(
    eq(members.systemId, auth.systemId),
    eq(members.isArchived, 0)
  );

  const [result, totalRow] = await Promise.all([
    db.query.members.findMany({
      columns: {
        id: true,
        name: true,
        pronouns: true,
        role: true,
        tags: true,
        color: true,
        avatarUrl: true,
      },
      where,
      orderBy: (m, { asc }) => [asc(m.name)],
      limit,
      offset,
    }),
    db.select({ value: count() }).from(members).where(where),
  ]);

  const total = totalRow[0]?.value ?? 0;

  const data = result.map((m) => ({
    ...m,
    tags: parseStoredTags(m.tags),
  }));

  return ok({ data, total }, 200, {
    headers: {
      'Cache-Control': 'private, max-age=0, s-maxage=30, stale-while-revalidate=120',
    },
  });
}

// POST /api/members — create a new member
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const tags = readTags(body.tags);

  if (!name) return err('Name is required');
  if (!tags) return err('tags must be an array of strings');

  const now = new Date();
  const newMemberId = createId();
  const newMember = await db.insert(members).values({
    id:          newMemberId,
    systemId:    auth.systemId,
    name,
    pronouns:    readOptionalString(body.pronouns),
    avatarUrl:   readOptionalString(body.avatarUrl),
    description: readOptionalString(body.description),
    color:       readOptionalString(body.color),
    role:        readOptionalString(body.role),
    tags:        tags.length > 0 ? JSON.stringify(tags) : null,
    notes:       readOptionalString(body.notes),
    isArchived:  0,
    createdAt:   now,
    updatedAt:   now,
  }).returning();

  const savedCustomFieldValues = await saveMemberCustomFieldValues(
    auth.systemId,
    newMemberId,
    body.customFieldValues,
  );

  revalidatePath('/');
  revalidatePath('/members');
  revalidatePath('/front');

  return ok({ ...newMember[0], tags, customFieldValues: savedCustomFieldValues }, 201);
}
