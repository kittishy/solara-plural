import { eq, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/helpers';
import { db } from '@/lib/db';
import { parseFrontMembers, getMemberIds } from '@/lib/front';
import {
  frontEntries,
  customFields,
  memberFieldValues,
  memberExternalLinks,
  members,
  memberGroups,
  memberGroupMembers,
  memberRelationships,
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

  const [
    allMembers,
    allFront,
    allNotes,
    allFriendRequests,
    allFriendships,
    allBlocks,
    allMemberShares,
    allExternalLinks,
    allCustomFields,
    allMemberFieldValues,
    allMemberGroups,
    allMemberGroupMembers,
    allMemberRelationships,
  ] = await Promise.all([
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
    db
      .select()
      .from(customFields)
      .where(eq(customFields.systemId, auth.systemId)),
    db
      .select()
      .from(memberFieldValues)
      .where(eq(memberFieldValues.systemId, auth.systemId)),
    db
      .select()
      .from(memberGroups)
      .where(eq(memberGroups.systemId, auth.systemId)),
    db
      .select({
        groupId: memberGroupMembers.groupId,
        memberId: memberGroupMembers.memberId,
      })
      .from(memberGroupMembers)
      .innerJoin(memberGroups, eq(memberGroupMembers.groupId, memberGroups.id))
      .where(eq(memberGroups.systemId, auth.systemId)),
    db
      .select()
      .from(memberRelationships)
      .where(eq(memberRelationships.systemId, auth.systemId)),
  ]);

  const exportData = {
    version: 6,
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
    frontHistory: allFront.map((entry) => {
      const members = parseFrontMembers(entry.memberIds);
      return { ...entry, members, memberIds: getMemberIds(members) };
    }),
    notes: allNotes,
    customFields: {
      definitions: allCustomFields.map((field) => ({
        ...field,
        options: safeJsonArray(field.options),
      })),
      memberValues: allMemberFieldValues,
    },
    groups: {
      definitions: allMemberGroups,
      memberships: allMemberGroupMembers,
    },
    relationships: allMemberRelationships,
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
