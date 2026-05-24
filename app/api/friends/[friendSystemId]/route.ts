import { and, eq, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  frontEntries,
  members,
  systemBlocks,
  systemFriendMemberShares,
  systemFriendships,
  systemPartnerRequests,
  systemPartnerships,
  systems,
} from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import {
  canonicalFriendPair,
  parseStoredFieldVisibilityJson,
  type FriendMemberFieldVisibility,
  type FriendMemberVisibility,
} from '@/lib/friends';

type Params = { params: Promise<{ friendSystemId: string }> };

function parseMemberIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function visibleField<T>(
  value: T,
  fieldVisibility: FriendMemberFieldVisibility,
  key: keyof FriendMemberFieldVisibility,
): T | null {
  return fieldVisibility[key] ? value : null;
}

// GET /api/friends/[friendSystemId]
// Returns a friend's public profile, their shared members, and current front.
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { friendSystemId } = await params;
  if (!friendSystemId) return err('Friend system ID is required.', 400);
  if (friendSystemId === auth.systemId) return err('Cannot view your own system here.', 400);

  const pair = canonicalFriendPair(auth.systemId, friendSystemId);

  const [friendship, block, friendSystem] = await Promise.all([
    db.query.systemFriendships.findFirst({
      where: and(
        eq(systemFriendships.systemAId, pair.systemAId),
        eq(systemFriendships.systemBId, pair.systemBId),
      ),
    }),
    db.query.systemBlocks.findFirst({
      where: or(
        and(eq(systemBlocks.blockerSystemId, auth.systemId), eq(systemBlocks.blockedSystemId, friendSystemId)),
        and(eq(systemBlocks.blockerSystemId, friendSystemId), eq(systemBlocks.blockedSystemId, auth.systemId)),
      ),
    }),
    db.query.systems.findFirst({
      columns: { id: true, name: true, description: true, accountType: true, avatarMode: true, avatarEmoji: true, avatarUrl: true },
      where: eq(systems.id, friendSystemId),
    }),
  ]);

  if (!friendSystem) return err('System not found.', 404);
  if (block) return err('This profile is unavailable.', 403);
  if (!friendship) return err('Friendship not found.', 404);

  // Load what the friend has chosen to share with us
  const [shareRows, friendMembers, activeFront] = await Promise.all([
    db.query.systemFriendMemberShares.findMany({
      columns: { memberId: true, visibility: true, fieldVisibility: true },
      where: and(
        eq(systemFriendMemberShares.ownerSystemId, friendSystemId),
        eq(systemFriendMemberShares.friendSystemId, auth.systemId),
      ),
    }),
    db.query.members.findMany({
      columns: { id: true, name: true, pronouns: true, avatarUrl: true, description: true, color: true, isArchived: true },
      where: eq(members.systemId, friendSystemId),
      orderBy: (m, { asc }) => [asc(m.name)],
    }),
    db.query.frontEntries.findFirst({
      columns: { memberIds: true, startedAt: true },
      where: and(eq(frontEntries.systemId, friendSystemId), isNull(frontEntries.endedAt)),
    }),
  ]);

  const shareByMemberId = new Map(shareRows.map((row) => [row.memberId, row]));
  const sharedMembers: { id: string; name: string; pronouns: string | null; avatarUrl: string | null; color: string | null }[] = [];
  const visibleIds = new Set<string>();

  for (const member of friendMembers) {
    if (member.isArchived === 1) continue;
    const share = shareByMemberId.get(member.id);
    if (!share || share.visibility === 'hidden') continue;

    const visibility = share.visibility as FriendMemberVisibility;
    const fieldVis = parseStoredFieldVisibilityJson(share.fieldVisibility, visibility);

    sharedMembers.push({
      id: member.id,
      name: member.name,
      pronouns: visibleField(member.pronouns, fieldVis, 'pronouns'),
      avatarUrl: visibleField(member.avatarUrl, fieldVis, 'avatarUrl'),
      color: visibleField(member.color, fieldVis, 'color'),
    });
    visibleIds.add(member.id);
  }

  const sharedMembersById = new Map(sharedMembers.map((m) => [m.id, m]));

  let currentFront: { members: { id: string; name: string; avatarUrl: string | null; color: string | null }[] } | null = null;
  if (activeFront) {
    const frontMemberIds = parseMemberIds(activeFront.memberIds).filter((id) => visibleIds.has(id));
    const frontMembers = frontMemberIds
      .map((id) => sharedMembersById.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl, color: m.color }));
    if (frontMembers.length > 0) {
      currentFront = { members: frontMembers };
    }
  }

  return ok({
    id: friendSystem.id,
    name: friendSystem.name,
    description: friendSystem.description,
    accountType: friendSystem.accountType,
    avatarMode: friendSystem.avatarMode,
    avatarEmoji: friendSystem.avatarEmoji,
    avatarUrl: friendSystem.avatarUrl,
    sharedMembers,
    currentFront,
  });
}

// DELETE /api/friends/[friendSystemId]
// Removes an active friendship and any sharing configuration tied to it.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { friendSystemId } = await params;
  if (!friendSystemId) return err('Friend account is required.', 400);
  if (friendSystemId === auth.systemId) return err('You cannot unfriend your own account.', 400);

  const pair = canonicalFriendPair(auth.systemId, friendSystemId);

  const removedFriendship = await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(systemFriendships)
      .where(and(
        eq(systemFriendships.systemAId, pair.systemAId),
        eq(systemFriendships.systemBId, pair.systemBId),
      ))
      .returning({ id: systemFriendships.id });

    if (!deleted.length) {
      return false;
    }

    await tx
      .delete(systemFriendMemberShares)
      .where(or(
        and(
          eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
          eq(systemFriendMemberShares.friendSystemId, friendSystemId),
        ),
        and(
          eq(systemFriendMemberShares.ownerSystemId, friendSystemId),
          eq(systemFriendMemberShares.friendSystemId, auth.systemId),
        ),
      ));

    await tx
      .delete(systemPartnerships)
      .where(and(
        eq(systemPartnerships.systemAId, pair.systemAId),
        eq(systemPartnerships.systemBId, pair.systemBId),
      ));

    await tx
      .delete(systemPartnerRequests)
      .where(and(
        eq(systemPartnerRequests.status, 'pending'),
        or(
          and(
            eq(systemPartnerRequests.senderSystemId, auth.systemId),
            eq(systemPartnerRequests.receiverSystemId, friendSystemId),
          ),
          and(
            eq(systemPartnerRequests.senderSystemId, friendSystemId),
            eq(systemPartnerRequests.receiverSystemId, auth.systemId),
          ),
        ),
      ));

    return true;
  });

  if (!removedFriendship) {
    return err('Friendship not found.', 404);
  }

  revalidatePath('/friends');
  revalidatePath('/partners');
  revalidatePath('/');

  return ok({
    unfriended: true,
    friendSystemId,
  });
}
