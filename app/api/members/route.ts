import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';

// GET /api/members — list all members for current system
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const result = await db.query.members.findMany({
    where: and(
      eq(members.systemId, auth.systemId),
      eq(members.isArchived, 0)
    ),
    orderBy: (m, { asc }) => [asc(m.name)],
  });

  // Parse tags JSON for each member
  const parsed = result.map((m) => ({
    ...m,
    tags: m.tags ? JSON.parse(m.tags) : [],
  }));

  return ok(parsed, 200, {
    headers: {
      'Cache-Control': 'private, max-age=0, s-maxage=30, stale-while-revalidate=120',
    },
  });
}

// POST /api/members — create a new member
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, pronouns, avatarUrl, description, color, role, tags, notes } = body;

  if (!name?.trim()) return err('Name is required');

  const now = new Date();
  const newMember = await db.insert(members).values({
    id:          createId(),
    systemId:    auth.systemId,
    name:        name.trim(),
    pronouns:    pronouns ?? null,
    avatarUrl:   avatarUrl ?? null,
    description: description ?? null,
    color:       color ?? null,
    role:        role ?? null,
    tags:        tags ? JSON.stringify(tags) : null,
    notes:       notes ?? null,
    isArchived:  0,
    createdAt:   now,
    updatedAt:   now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/members');
  revalidatePath('/front');

  return ok({ ...newMember[0], tags: tags ?? [] }, 201);
}
