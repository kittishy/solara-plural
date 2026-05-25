import { createId } from '@paralleldrive/cuid2';
import { and, eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { members, systemBlocks, systemFriendMemberShares, systemFriendships, systems } from '@/lib/db/schema';
import { err, ok, requireAuth, parseJsonRecord } from '@/lib/api/helpers';
import {
  canonicalFriendPair,
  defaultFieldVisibilityForLevel,
  parseFriendMemberFieldVisibility,
  parseFriendMemberVisibility,
  parseStoredFieldVisibilityJson,
} from '@/lib/friends';

type Params = { params: Promise<{ friendSystemId: string }> };

async function ensureActiveFriendship(ownerSystemId: string, friendSystemId: string) {
  const pair = canonicalFriendPair(ownerSystemId, friendSystemId);

  const [friendship, block, friendAccount] = await Promise.all([
    db.query.systemFriendships.findFirst({
      where: and(
        eq(systemFriendships.systemAId, pair.systemAId),
        eq(systemFriendships.systemBId, pair.systemBId),
      ),
    }),
    db.query.systemBlocks.findFirst({
      where: or(
        and(
          eq(systemBlocks.blockerSystemId, ownerSystemId),
          eq(systemBlocks.blockedSystemId, friendSystemId),
        ),
        and(
          eq(systemBlocks.blockerSystemId, friendSystemId),
          eq(systemBlocks.blockedSystemId, ownerSystemId),
        ),
      ),
    }),
    db.query.systems.findFirst({
      columns: { id: true, name: true, accountType: true },
      where: eq(systems.id, friendSystemId),
    }),
  ]);

  if (!friendAccount) {
    return { error: err('Friend account not found.', 404) } as const;
  }

  if (block) {
    return { error: err('Sharing is unavailable while either account is blocked.', 403) } as const;
  }

  if (!friendship) {
    return { error: err('Active friendship required to configure sharing.', 404) } as const;
  }

  return { friend: friendAccount } as const;
}

// GET /api/friends/sharing/[friendSystemId]
// Returns per-member visibility for the signed-in owner system.
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { friendSystemId } = await params;
  if (!friendSystemId) return err('Friend account is required.', 400);
  if (friendSystemId === auth.systemId) return err('Self sharing is not supported.', 400);

  const relationship = await ensureActiveFriendship(auth.systemId, friendSystemId);
  if ('error' in relationship) return relationship.error;

  const [ownedMembers, shareRows] = await Promise.all([
    db.query.members.findMany({
      columns: { id: true, name: true, isArchived: true },
      where: eq(members.systemId, auth.systemId),
      orderBy: (member, { asc }) => [asc(member.name)],
    }),
    db.query.systemFriendMemberShares.findMany({
      columns: { memberId: true, visibility: true, fieldVisibility: true, updatedAt: true },
      where: and(
        eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
        eq(systemFriendMemberShares.friendSystemId, friendSystemId),
      ),
    }),
  ]);

  const shareByMemberId = new Map(shareRows.map((row) => [row.memberId, row]));

  return ok({
    friend: relationship.friend,
    members: ownedMembers.map((member) => ({
      id: member.id,
      name: member.name,
      isArchived: member.isArchived === 1,
      visibility: shareByMemberId.get(member.id)?.visibility ?? 'hidden',
      fieldVisibility: parseStoredFieldVisibilityJson(
        shareByMemberId.get(member.id)?.fieldVisibility ?? null,
        (shareByMemberId.get(member.id)?.visibility as 'hidden' | 'profile' | 'full' | undefined) ?? 'hidden',
      ),
      updatedAt: shareByMemberId.get(member.id)?.updatedAt ?? null,
    })),
  });
}

// PATCH /api/friends/sharing/[friendSystemId]
// Body: { visibility: "hidden" | "profile" | "full" }
// Sets ALL non-archived members to the given visibility level atomically.
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { friendSystemId } = await params;
  if (!friendSystemId) return err('Friend account is required.', 400);
  if (friendSystemId === auth.systemId) return err('Self sharing is not supported.', 400);

  const relationship = await ensureActiveFriendship(auth.systemId, friendSystemId);
  if ('error' in relationship) return relationship.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const visibility = parseFriendMemberVisibility(body.visibility);
  if (!visibility) {
    return err('Invalid visibility. Use "hidden", "profile", or "full".', 400);
  }

  const ownedMembers = await db.query.members.findMany({
    columns: { id: true },
    where: and(eq(members.systemId, auth.systemId), eq(members.isArchived, 0)),
  });

  if (visibility === 'hidden') {
    await db
      .delete(systemFriendMemberShares)
      .where(and(
        eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
        eq(systemFriendMemberShares.friendSystemId, friendSystemId),
      ));
  } else {
    const fieldVisibility = defaultFieldVisibilityForLevel(visibility);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .delete(systemFriendMemberShares)
        .where(and(
          eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
          eq(systemFriendMemberShares.friendSystemId, friendSystemId),
        ));

      if (ownedMembers.length > 0) {
        await tx
          .insert(systemFriendMemberShares)
          .values(ownedMembers.map((member) => ({
            id: createId(),
            ownerSystemId: auth.systemId,
            friendSystemId,
            memberId: member.id,
            visibility,
            fieldVisibility: JSON.stringify(fieldVisibility),
            createdAt: now,
            updatedAt: now,
          })));
      }
    });
  }

  revalidatePath('/friends');

  return ok({ visibility, count: ownedMembers.length });
}

// PUT /api/friends/sharing/[friendSystemId]
// Body: {
//   memberId: string,
//   visibility: "hidden" | "profile" | "full",
//   fieldVisibility?: { pronouns?: boolean, description?: boolean, avatarUrl?: boolean, color?: boolean, role?: boolean, tags?: boolean, notes?: boolean }
// }
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { friendSystemId } = await params;
  if (!friendSystemId) return err('Friend account is required.', 400);
  if (friendSystemId === auth.systemId) return err('Self sharing is not supported.', 400);

  const relationship = await ensureActiveFriendship(auth.systemId, friendSystemId);
  if ('error' in relationship) return relationship.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const memberId = typeof body.memberId === 'string' ? body.memberId.trim() : '';
  if (!memberId) return err('memberId is required.', 400);

  const visibility = parseFriendMemberVisibility(body.visibility);
  if (!visibility) {
    return err('Invalid visibility. Use "hidden", "profile", or "full".', 400);
  }
  const parsedFieldVisibility = parseFriendMemberFieldVisibility(body.fieldVisibility);
  const effectiveFieldVisibility = parsedFieldVisibility ?? defaultFieldVisibilityForLevel(visibility);

  const ownedMember = await db.query.members.findFirst({
    columns: { id: true, name: true },
    where: and(
      eq(members.id, memberId),
      eq(members.systemId, auth.systemId),
    ),
  });

  if (!ownedMember) {
    return err('Member not found for your system.', 404);
  }

  const now = new Date();

  if (visibility === 'hidden') {
    await db
      .delete(systemFriendMemberShares)
      .where(and(
        eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
        eq(systemFriendMemberShares.friendSystemId, friendSystemId),
        eq(systemFriendMemberShares.memberId, memberId),
      ));
  } else {
    await db
      .insert(systemFriendMemberShares)
      .values({
        id: createId(),
        ownerSystemId: auth.systemId,
        friendSystemId,
        memberId,
        visibility,
        fieldVisibility: JSON.stringify(effectiveFieldVisibility),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          systemFriendMemberShares.ownerSystemId,
          systemFriendMemberShares.friendSystemId,
          systemFriendMemberShares.memberId,
        ],
        set: {
          visibility,
          fieldVisibility: JSON.stringify(effectiveFieldVisibility),
          updatedAt: now,
        },
      });
  }

  revalidatePath('/friends');

  return ok({
    friend: relationship.friend,
    member: {
      id: ownedMember.id,
      name: ownedMember.name,
    },
    visibility,
    fieldVisibility: effectiveFieldVisibility,
  });
}
