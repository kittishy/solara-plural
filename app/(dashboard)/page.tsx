import { db } from "@/lib/db";
import {
  members,
  frontEntries,
  systemJournal,
  systemNotes,
  systems,
  systemFriendships,
  systemPartnerships,
} from "@/lib/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { requireSystemId } from "@/lib/auth/session";
import { parseMemberIds } from "@/lib/front";
import { HomeContent } from "./HomeContent";

export default async function DashboardPage() {
  const systemId = await requireSystemId();

  const [
    system,
    memberCount,
    activeFront,
    journalCount,
    noteCount,
    friendCount,
    partnerCount,
  ] = await Promise.all([
    db.query.systems.findFirst({
      columns: { name: true, description: true },
      where: eq(systems.id, systemId),
    }),
    db.query.members
      .findMany({
        columns: { id: true },
        where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
      })
      .then((r) => r.length),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
    db.query.systemJournal
      .findMany({
        columns: { id: true },
        where: eq(systemJournal.systemId, systemId),
      })
      .then((r) => r.length),
    db.query.systemNotes
      .findMany({
        columns: { id: true },
        where: eq(systemNotes.systemId, systemId),
      })
      .then((r) => r.length),
    db.query.systemFriendships
      .findMany({
        columns: { id: true },
        where: or(
          eq(systemFriendships.systemAId, systemId),
          eq(systemFriendships.systemBId, systemId)
        ),
      })
      .then((r) => r.length),
    db.query.systemPartnerships
      .findMany({
        columns: { id: true },
        where: or(
          eq(systemPartnerships.systemAId, systemId),
          eq(systemPartnerships.systemBId, systemId)
        ),
      })
      .then((r) => r.length),
  ]);

  const frontingIds = activeFront ? parseMemberIds(activeFront.memberIds) : [];
  const frontingMembers =
    frontingIds.length > 0
      ? await db.query.members.findMany({
          columns: {
            id: true,
            name: true,
            pronouns: true,
            color: true,
            avatarUrl: true,
          },
          where: (m, { inArray }) => inArray(m.id, frontingIds),
        })
      : [];

  const recentMembers = await db.query.members.findMany({
    columns: {
      id: true,
      name: true,
      pronouns: true,
      color: true,
      avatarUrl: true,
      tags: true,
      createdAt: true,
    },
    where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
    orderBy: (m, { desc: d }) => [d(m.createdAt)],
    limit: 5,
  });

  return (
    <HomeContent
      systemName={system?.name}
      memberCount={memberCount}
      frontingCount={frontingMembers.length}
      journalCount={journalCount}
      noteCount={noteCount}
      friendCount={friendCount}
      partnerCount={partnerCount}
      frontingMembers={frontingMembers}
      recentMembers={recentMembers}
    />
  );
}
