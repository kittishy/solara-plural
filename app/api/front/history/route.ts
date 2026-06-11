import { db } from '@/lib/db';
import { frontEntries, members } from '@/lib/db/schema';
import { eq, and, isNotNull, desc, inArray } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { parseDatetimeLocalValue, parseFrontMembers, serializeFrontMembers, getMemberIds, type FrontMember, type FrontTier } from '@/lib/front';
import { revalidatePath } from 'next/cache';

// GET /api/front/history — front history
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const offset = Number(searchParams.get('offset') ?? 0);

  const history = await db.query.frontEntries.findMany({
    where: and(
      eq(frontEntries.systemId, auth.systemId),
      isNotNull(frontEntries.endedAt)
    ),
    orderBy: (f, { desc }) => [desc(f.startedAt)],
    limit,
    offset,
  });

  const parsed = history.map((e) => {
    const members = parseFrontMembers(e.memberIds);
    return { ...e, members, memberIds: getMemberIds(members) };
  });

  return ok(parsed, 200, {
    headers: {
      'Cache-Control': 'private, max-age=0, s-maxage=20, stale-while-revalidate=60',
    },
  });
}

// POST /api/front/history — create a retroactive front entry
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const startedAt = typeof body.startedAt === 'string' ? parseDatetimeLocalValue(body.startedAt) : null;
  const endedAt = typeof body.endedAt === 'string' ? parseDatetimeLocalValue(body.endedAt) : null;
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!startedAt || !endedAt) return err('startedAt and endedAt are required');
  if (endedAt < startedAt) return err('endedAt must be after startedAt');

  // Accept both new format (members[]) and legacy format (memberIds[]).
  let incomingMembers: FrontMember[];
  if (Array.isArray(body.members) && body.members.length > 0) {
    incomingMembers = (body.members as Array<Record<string, unknown>>).map((m) => {
      const t = m.tier;
      const tier: FrontTier = t === 'co-front' || t === 'co-conscious' ? t : 'primary';
      return { memberId: String(m.memberId), tier };
    });
  } else if (Array.isArray(body.memberIds) && body.memberIds.length > 0) {
    incomingMembers = (body.memberIds as string[]).map((id) => ({ memberId: id, tier: 'primary' as FrontTier }));
  } else {
    return err('members must be a non-empty array');
  }

  const memberIds = getMemberIds(incomingMembers);

  const availableMembers = await db.query.members.findMany({
    where: and(eq(members.systemId, auth.systemId), inArray(members.id, memberIds)),
  });

  if (availableMembers.length !== memberIds.length) {
    return err('One or more memberIds are invalid');
  }

  const created = await db.insert(frontEntries).values({
    id: createId(),
    systemId: auth.systemId,
    memberIds: serializeFrontMembers(incomingMembers),
    startedAt,
    endedAt,
    note: note || null,
    createdAt: new Date(),
  }).returning();

  revalidatePath('/');
  revalidatePath('/front');
  revalidatePath('/members');
  revalidatePath('/front/history');

  return ok({ ...created[0], members: incomingMembers, memberIds }, 201);
}
