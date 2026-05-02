import { eq, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/helpers';
import { db } from '@/lib/db';
import {
  frontEntries,
  memberExternalLinks,
  members,
  systemBlocks,
  systemFriendMemberShares,
  systemFriendRequests,
  systemFriendships,
  systemNotes,
  systems,
} from '@/lib/db/schema';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const [system] = await db
    .select()
    .from(systems)
    .where(eq(systems.id, auth.systemId));

  if (!system) {
    return NextResponse.json({ success: false, error: 'System profile not found.' }, { status: 404 });
  }

  const [allMembers, allFront, allNotes, allFriendRequests, allFriendships, allBlocks, allMemberShares, allExternalLinks] = await Promise.all([
    db.select().from(members).where(eq(members.systemId, auth.systemId)),
    db.select().from(frontEntries).where(eq(frontEntries.systemId, auth.systemId)),
    db.select().from(systemNotes).where(eq(systemNotes.systemId, auth.systemId)),
    db
      .select()
      .from(systemFriendRequests)
      .where(or(
        eq(systemFriendRequests.senderSystemId, auth.systemId),
        eq(systemFriendRequests.receiverSystemId, auth.systemId),
      )),
    db
      .select()
      .from(systemFriendships)
      .where(or(
        eq(systemFriendships.systemAId, auth.systemId),
        eq(systemFriendships.systemBId, auth.systemId),
      )),
    db
      .select()
      .from(systemBlocks)
      .where(or(
        eq(systemBlocks.blockerSystemId, auth.systemId),
        eq(systemBlocks.blockedSystemId, auth.systemId),
      )),
    db
      .select()
      .from(systemFriendMemberShares)
      .where(or(
        eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
        eq(systemFriendMemberShares.friendSystemId, auth.systemId),
      )),
    db
      .select()
      .from(memberExternalLinks)
      .where(eq(memberExternalLinks.systemId, auth.systemId)),
  ]);

  const exportData = {
    version: 4,
    exportedAt: new Date().toISOString(),
    system: {
      id: system.id,
      name: system.name,
      description: system.description,
      accountType: system.accountType,
    },
    members: allMembers.map((member) => ({
      ...member,
      tags: safeJsonArray(member.tags),
    })),
    frontHistory: allFront.map((entry) => ({
      ...entry,
      memberIds: safeJsonArray(entry.memberIds),
    })),
    notes: allNotes,
    integrations: {
      memberExternalLinks: allExternalLinks,
    },
    social: {
      friendRequests: allFriendRequests,
      friendships: allFriendships,
      blocks: allBlocks,
      memberSharing: allMemberShares,
    },
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="solara-export-${Date.now()}.json"`,
    },
  });
}

function safeJsonArray(value: string | null): unknown[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
