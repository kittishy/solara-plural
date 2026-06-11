import { db } from '@/lib/db';
import { systems, members } from '@/lib/db/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';
import { normalizeSlug, validateSlug } from '@/lib/public-profile';

// GET /api/public-profile — current system's public-profile settings + the set
// of members currently flagged public (so the settings UI can render checkboxes).
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const system = await db.query.systems.findFirst({
    columns: {
      publicSlug: true,
      isPublic: true,
      publicShowBio: true,
      publicShowMembers: true,
      publicShowFront: true,
    },
    where: eq(systems.id, auth.systemId),
  });
  if (!system) return err('System not found', 404);

  const publicMembers = await db.query.members.findMany({
    columns: { id: true },
    where: and(eq(members.systemId, auth.systemId), eq(members.isPublic, 1)),
  });

  return ok({
    slug: system.publicSlug,
    isPublic: system.isPublic === 1,
    showBio: system.publicShowBio === 1,
    showMembers: system.publicShowMembers === 1,
    showFront: system.publicShowFront === 1,
    publicMemberIds: publicMembers.map((m) => m.id),
  });
}

// PUT /api/public-profile — update the settings in one shot.
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const isPublic = body.isPublic === true;

  // Slug: optional. Empty/null clears it. Otherwise normalize + validate +
  // ensure it isn't taken by another system.
  let slug: string | null = null;
  if (typeof body.slug === 'string' && body.slug.trim()) {
    slug = normalizeSlug(body.slug);
    const slugError = validateSlug(slug);
    if (slugError) return err(`slug:${slugError}`);

    const taken = await db.query.systems.findFirst({
      columns: { id: true },
      where: and(eq(systems.publicSlug, slug), ne(systems.id, auth.systemId)),
    });
    if (taken) return err('slug:taken');
  }

  // A profile can't be public without a slug to reach it.
  if (isPublic && !slug) return err('slug:required');

  const showBio = body.showBio !== false; // defaults on
  const showMembers = body.showMembers === true;
  const showFront = body.showFront === true;

  await db.update(systems)
    .set({
      publicSlug: slug,
      isPublic: isPublic ? 1 : 0,
      publicShowBio: showBio ? 1 : 0,
      publicShowMembers: showMembers ? 1 : 0,
      publicShowFront: showFront ? 1 : 0,
      updatedAt: new Date(),
    })
    .where(eq(systems.id, auth.systemId));

  // Per-member visibility: reset everyone to private, then re-flag the chosen
  // ones. Scoping the writes by systemId keeps it safe even if foreign IDs slip
  // into the payload.
  const publicMemberIds: string[] = Array.isArray(body.publicMemberIds)
    ? (body.publicMemberIds as unknown[]).filter(
        (v): v is string => typeof v === 'string' && Boolean(v.trim())
      )
    : [];

  await db.update(members)
    .set({ isPublic: 0 })
    .where(and(eq(members.systemId, auth.systemId), eq(members.isPublic, 1)));

  if (publicMemberIds.length > 0) {
    await db.update(members)
      .set({ isPublic: 1 })
      .where(and(
        eq(members.systemId, auth.systemId),
        inArray(members.id, publicMemberIds)
      ));
  }

  if (slug) revalidatePath(`/u/${slug}`);
  revalidatePath('/settings/public-profile');

  return ok({
    slug,
    isPublic,
    showBio,
    showMembers,
    showFront,
    publicMemberIds,
  });
}
