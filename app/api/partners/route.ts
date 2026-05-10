import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  frontEntries,
  members,
  systemPartnerRequests,
  systemPartnerships,
  systems,
} from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { canonicalFriendPair, normalizeEmail } from '@/lib/friends';

// GET /api/partners
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
  for (const p of partnerships) {
    relatedIds.add(p.systemAId === auth.systemId ? p.systemBId : p.systemAId);
  }
  for (const r of incomingRequests) relatedIds.add(r.senderSystemId);
  for (const r of outgoingRequests) relatedIds.add(r.receiverSystemId);

  const profiles = relatedIds.size > 0
    ? await db.query.systems.findMany({
        columns: { id: true, name: true, accountType: true, avatarMode: true, avatarEmoji: true, avatarUrl: true, description: true },
        where: inArray(systems.id, Array.from(relatedIds)),
      })
    : [];

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const partnerSystemIds = partnerships.map((p) =>
    p.systemAId === auth.systemId ? p.systemBId : p.systemAId
  );

  // Fetch active fronts for all partner systems — partners see full fronting info
  const [activeFronts, frontingMembers] = partnerSystemIds.length > 0
    ? await Promise.all([
        db.query.frontEntries.findMany({
          where: and(
            inArray(frontEntries.systemId, partnerSystemIds),
            isNull(frontEntries.endedAt),
          ),
        }),
        db.query.members.findMany({
          columns: { id: true, systemId: true, name: true, color: true, avatarUrl: true, pronouns: true },
          where: and(
            inArray(members.systemId, partnerSystemIds),
            eq(members.isArchived, 0),
          ),
        }),
      ])
    : [[], []];

  const activeFrontBySystemId = new Map(activeFronts.map((f) => [f.systemId, f]));
  const membersBySystemId = new Map<string, typeof frontingMembers>();
  for (const m of frontingMembers) {
    const arr = membersBySystemId.get(m.systemId) ?? [];
    arr.push(m);
    membersBySystemId.set(m.systemId, arr);
  }

  function parseMemberIds(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch { return []; }
  }

  const partnerList = partnerships.map((p) => {
    const partnerId = p.systemAId === auth.systemId ? p.systemBId : p.systemAId;
    const profile = profileById.get(partnerId);
    if (!profile) return null;

    const activeFront = activeFrontBySystemId.get(partnerId);
    const allMembers = membersBySystemId.get(partnerId) ?? [];
    const currentFront = activeFront
      ? {
          startedAt: activeFront.startedAt,
          members: parseMemberIds(activeFront.memberIds)
            .map((id) => allMembers.find((m) => m.id === id))
            .filter((m): m is NonNullable<typeof m> => Boolean(m)),
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
      currentFront,
    };
  }).filter((p): p is NonNullable<typeof p> => Boolean(p));

  const incoming = incomingRequests.map((r) => {
    const from = profileById.get(r.senderSystemId);
    if (!from) return null;
    return { requestId: r.id, from: { id: from.id, name: from.name, accountType: from.accountType }, message: r.message, createdAt: r.createdAt };
  }).filter((r): r is NonNullable<typeof r> => Boolean(r));

  const outgoing = outgoingRequests.map((r) => {
    const to = profileById.get(r.receiverSystemId);
    if (!to) return null;
    return { requestId: r.id, to: { id: to.id, name: to.name, accountType: to.accountType }, message: r.message, createdAt: r.createdAt };
  }).filter((r): r is NonNullable<typeof r> => Boolean(r));

  return ok({ partners: partnerList, incomingRequests: incoming, outgoingRequests: outgoing });
}

// POST /api/partners
// Body: { email?: string, systemId?: string, message?: string }
// Accepts email (new invite) or systemId (promote existing friend)
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try { body = await request.json(); } catch { return err('Invalid request payload.', 400); }

  const payload = body as { email?: unknown; systemId?: unknown; message?: unknown };
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

  // Check existing partnership
  const pair = canonicalFriendPair(auth.systemId, receiver.id);
  const existing = await db.query.systemPartnerships.findFirst({
    where: and(
      eq(systemPartnerships.systemAId, pair.systemAId),
      eq(systemPartnerships.systemBId, pair.systemBId),
    ),
  });
  if (existing) return err('You are already partners.', 409);

  // Check inverse pending (auto-accept)
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

  // Check already pending
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
