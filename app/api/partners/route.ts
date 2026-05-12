import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
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
import { err, ok, requireAuth, parseJsonRecord } from '@/lib/api/helpers';
import {
  canonicalFriendPair,
  normalizeEmail,
  parseStoredFieldVisibilityJson,
  type FriendMemberFieldVisibility,
  type FriendMemberVisibility,
} from '@/lib/friends';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const [partnerships, incomingRequests, outgoingRequests] = await Promise.all([
    db.query.systemPartnerships.findMany({
      where: or(
        eq(systemPartnerships.systemAId, auth.systemId),
        eq(systemPartnerships.systemBId, auth.systemId),
      ),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    }),
    db.query.systemPartnerRequests.findMany({
      where: and(
        eq(systemPartnerRequests.receiverSystemId, auth.systemId),
        eq(systemPartnerRequests.status, 'pending'),
      ),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    }),
    db.query.systemPartnerRequests.findMany({
      where: and(
        eq(systemPartnerRequests.senderSystemId, auth.systemId),
        eq(systemPartnerRequests.status, 'pending'),
      ),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    }),
  ]);

  const relatedIds = new Set<string>();
  for (const p of partnerships) relatedIds.add(p.systemAId === auth.systemId ? p.systemBId : p.systemAId);
  for (const r of incomingRequests) relatedIds.add(r.senderSystemId);
  for (const r of outgoingRequests) relatedIds.add(r.receiverSystemId);

  const profiles = relatedIds.size > 0
    ? await db.query.systems.findMany({
        columns: {
          id: true,
          name: true,
          accountType: true,
          avatarMode: true,
          avatarEmoji: true,
          avatarUrl: true,
          description: true,
        },
        where: inArray(systems.id, Array.from(relatedIds)),
      })
    : [];

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const partnerSystemIds = partnerships.map((p) => p.systemAId === auth.systemId ? p.systemBId : p.systemAId);

  const [activeFronts, visibleMemberRows, shareRows] = partnerSystemIds.length > 0
    ? await Promise.all([
        db.query.frontEntries.findMany({
          where: and(
            inArray(frontEntries.systemId, partnerSystemIds),
            isNull(frontEntries.endedAt),
          ),
        }),
        db.query.members.findMany({
          columns: {
            id: true,
            systemId: true,
            name: true,
            pronouns: true,
            avatarUrl: true,
            description: true,
            color: true,
            role: true,
            tags: true,
            isArchived: true,
          },
          where: and(
            inArray(members.systemId, partnerSystemIds),
            eq(members.isArchived, 0),
          ),
        }),
        db.query.systemFriendMemberShares.findMany({
          where: and(
            inArray(systemFriendMemberShares.ownerSystemId, partnerSystemIds),
            eq(systemFriendMemberShares.friendSystemId, auth.systemId),
          ),
        }),
      ])
    : [[], [], []];

  const activeFrontBySystemId = new Map(activeFronts.map((front) => [front.systemId, front]));
  const shareByMemberId = new Map(shareRows.map((share) => [share.memberId, share]));
  const membersBySystemId = new Map<string, PartnerVisibleMember[]>();
  const visibleMemberIdsBySystemId = new Map<string, Set<string>>();

  for (const member of visibleMemberRows) {
    const share = shareByMemberId.get(member.id);
    if (!share || share.visibility === 'hidden') continue;

    const visibility = share.visibility as FriendMemberVisibility;
    const fieldVisibility = parseStoredFieldVisibilityJson(share.fieldVisibility, visibility);
    const visibleMember: PartnerVisibleMember = {
      id: member.id,
      name: member.name,
      pronouns: visibleField(member.pronouns, fieldVisibility, 'pronouns'),
      avatarUrl: visibleField(member.avatarUrl, fieldVisibility, 'avatarUrl'),
      description: visibleField(member.description, fieldVisibility, 'description'),
      color: visibleField(member.color, fieldVisibility, 'color'),
      role: visibleField(member.role, fieldVisibility, 'role'),
      tags: fieldVisibility.tags ? parseMemberTags(member.tags) : [],
      visibility,
    };

    const visibleMembers = membersBySystemId.get(member.systemId) ?? [];
    visibleMembers.push(visibleMember);
    membersBySystemId.set(member.systemId, visibleMembers);

    const visibleIds = visibleMemberIdsBySystemId.get(member.systemId) ?? new Set<string>();
    visibleIds.add(member.id);
    visibleMemberIdsBySystemId.set(member.systemId, visibleIds);
  }

  const partnerList = partnerships
    .map((p) => {
      const partnerId = p.systemAId === auth.systemId ? p.systemBId : p.systemAId;
      const profile = profileById.get(partnerId);
      if (!profile) return null;

      const activeFront = activeFrontBySystemId.get(partnerId);
      const sharedMembers = membersBySystemId.get(partnerId) ?? [];
      const visibleIds = visibleMemberIdsBySystemId.get(partnerId) ?? new Set<string>();
      const currentFront = activeFront
        ? {
            startedAt: activeFront.startedAt,
            members: parseMemberIds(activeFront.memberIds)
              .filter((id) => visibleIds.has(id))
              .map((id) => sharedMembers.find((member) => member.id === id))
              .filter((member): member is PartnerVisibleMember => Boolean(member)),
          }
        : null;

      return {
        partnershipId: p.id,
        id: profile.id,
        name: profile.name,
        accountType: profile.accountType,
        avatarMode: profile.avatarMode,
        avatarEmoji: profile.avatarEmoji,
        avatarUrl: profile.avatarUrl,
        description: profile.description,
        relationshipLabel: p.relationshipLabel,
        partneredSince: p.partneredSince,
        connectedAt: p.createdAt,
        sharedMembers,
        currentFront: currentFront && currentFront.members.length > 0 ? currentFront : null,
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const incoming = incomingRequests
    .map((r) => {
      const from = profileById.get(r.senderSystemId);
      if (!from) return null;
      return {
        requestId: r.id,
        from: { id: from.id, name: from.name, accountType: from.accountType },
        message: r.message,
        createdAt: r.createdAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const outgoing = outgoingRequests
    .map((r) => {
      const to = profileById.get(r.receiverSystemId);
      if (!to) return null;
      return {
        requestId: r.id,
        to: { id: to.id, name: to.name, accountType: to.accountType },
        message: r.message,
        createdAt: r.createdAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return ok({ partners: partnerList, incomingRequests: incoming, outgoingRequests: outgoing });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const rawMessage = typeof payload.message === 'string' ? payload.message.trim().slice(0, 280) : '';
  const message = rawMessage.length > 0 ? rawMessage : null;

  let receiver: { id: string; name: string; accountType: string } | null = null;

  if (typeof payload.systemId === 'string' && payload.systemId) {
    const found = await db.query.systems.findFirst({
      columns: { id: true, name: true, accountType: true },
      where: eq(systems.id, payload.systemId),
    });
    receiver = found ?? null;
  } else if (typeof payload.email === 'string' && payload.email) {
    const email = normalizeEmail(payload.email);
    const found = await db.query.systems.findFirst({
      columns: { id: true, name: true, accountType: true },
      where: eq(systems.email, email),
    });
    receiver = found ?? null;
  }

  if (!receiver) return err('No account found.', 404);
  if (receiver.id === auth.systemId) return err('You cannot send a partner request to your own account.', 400);

  const pair = canonicalFriendPair(auth.systemId, receiver.id);
  const [friendship, block] = await Promise.all([
    db.query.systemFriendships.findFirst({
      where: and(
        eq(systemFriendships.systemAId, pair.systemAId),
        eq(systemFriendships.systemBId, pair.systemBId),
      ),
    }),
    db.query.systemBlocks.findFirst({
      where: or(
        and(eq(systemBlocks.blockerSystemId, auth.systemId), eq(systemBlocks.blockedSystemId, receiver.id)),
        and(eq(systemBlocks.blockerSystemId, receiver.id), eq(systemBlocks.blockedSystemId, auth.systemId)),
      ),
    }),
  ]);

  if (!friendship) return err('Add this account as a friend before making them a partner.', 409);
  if (block) return err('Partner requests are not available while either account is blocked.', 403);

  const existing = await db.query.systemPartnerships.findFirst({
    where: and(
      eq(systemPartnerships.systemAId, pair.systemAId),
      eq(systemPartnerships.systemBId, pair.systemBId),
    ),
  });
  if (existing) return err('You are already partners.', 409);

  const inversePending = await db.query.systemPartnerRequests.findFirst({
    where: and(
      eq(systemPartnerRequests.senderSystemId, receiver.id),
      eq(systemPartnerRequests.receiverSystemId, auth.systemId),
      eq(systemPartnerRequests.status, 'pending'),
    ),
  });

  if (inversePending) {
    const now = new Date();
    await db.update(systemPartnerRequests)
      .set({ status: 'accepted', respondedAt: now })
      .where(eq(systemPartnerRequests.id, inversePending.id));

    await db.insert(systemPartnerships).values({
      id: createId(),
      systemAId: pair.systemAId,
      systemBId: pair.systemBId,
      createdAt: now,
    }).onConflictDoNothing();

    revalidatePath('/partners');
    return ok({ autoAccepted: true, requestId: inversePending.id, partner: { id: receiver.id, name: receiver.name } });
  }

  const alreadyPending = await db.query.systemPartnerRequests.findFirst({
    where: and(
      eq(systemPartnerRequests.senderSystemId, auth.systemId),
      eq(systemPartnerRequests.receiverSystemId, receiver.id),
      eq(systemPartnerRequests.status, 'pending'),
    ),
  });
  if (alreadyPending) return err('A partner request is already pending.', 409);

  const created = await db.insert(systemPartnerRequests).values({
    id: createId(),
    senderSystemId: auth.systemId,
    receiverSystemId: receiver.id,
    status: 'pending',
    message,
    createdAt: new Date(),
  }).returning({ id: systemPartnerRequests.id, createdAt: systemPartnerRequests.createdAt });

  revalidatePath('/partners');

  return ok({
    requestId: created[0]?.id,
    createdAt: created[0]?.createdAt ?? new Date(),
    to: { id: receiver.id, name: receiver.name },
  }, 201);
}

type PartnerVisibleMember = {
  id: string;
  name: string;
  pronouns: string | null;
  avatarUrl: string | null;
  description: string | null;
  color: string | null;
  role: string | null;
  tags: string[];
  visibility: FriendMemberVisibility;
};

function parseMemberIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parseMemberTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
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
