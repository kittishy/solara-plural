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
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { requireSystemId } from "@/lib/auth/session";
import { parseMemberIds, safeParseMemberIds } from "@/lib/front";
import { HomeContent } from "./HomeContent";

export default async function DashboardPage() {
  const systemId = await requireSystemId();

  // Round 1 — all independent queries in parallel, including recentHistory
  // which previously ran after round 1 (waterfall removed)
  const [
    system,
    [memberCountRow],
    activeFront,
    [journalCountRow],
    [noteCountRow],
    [friendCountRow],
    [partnerCountRow],
    recentHistory,
  ] = await Promise.all([
    db.query.systems.findFirst({
      columns: { name: true, description: true },
      where: eq(systems.id, systemId),
    }),
    db.select({ value: count() }).from(members).where(
      and(eq(members.systemId, systemId), eq(members.isArchived, 0))
    ),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
    db.select({ value: count() }).from(systemJournal).where(
      eq(systemJournal.systemId, systemId)
    ),
    db.select({ value: count() }).from(systemNotes).where(
      eq(systemNotes.systemId, systemId)
    ),
    db.select({ value: count() }).from(systemFriendships).where(
      or(
        eq(systemFriendships.systemAId, systemId),
        eq(systemFriendships.systemBId, systemId)
      )
    ),
    db.select({ value: count() }).from(systemPartnerships).where(
      or(
        eq(systemPartnerships.systemAId, systemId),
        eq(systemPartnerships.systemBId, systemId)
      )
    ),
    db.query.frontEntries.findMany({
      columns: { memberIds: true },
      where: eq(frontEntries.systemId, systemId),
      orderBy: [desc(frontEntries.startedAt)],
      limit: 30,
    }),
  ]);

  const frontingIds = activeFront ? parseMemberIds(activeFront.memberIds) : [];

  // Compute recently fronted IDs from the history already fetched in round 1
  const recentlyFrontedIds: string[] = [];
  const seen = new Set<string>();
  for (const entry of recentHistory) {
    for (const id of safeParseMemberIds(entry.memberIds)) {
      if (!seen.has(id)) { seen.add(id); recentlyFrontedIds.push(id); }
      if (recentlyFrontedIds.length === 5) break;
    }
    if (recentlyFrontedIds.length === 5) break;
  }

  // Round 2 — frontingMembers + recentMembers in parallel (was 2 sequential round trips)
  const [frontingMembers, recentMembers] = await Promise.all([
    frontingIds.length > 0
      ? db.query.members.findMany({
          columns: { id: true, name: true, pronouns: true, color: true, avatarUrl: true },
          where: and(
            eq(members.systemId, systemId),
            inArray(members.id, frontingIds)
          ),
        })
      : Promise.resolve([]),
    recentlyFrontedIds.length > 0
      ? db.query.members.findMany({
          columns: { id: true, name: true, pronouns: true, color: true, avatarUrl: true, tags: true, createdAt: true },
          where: and(eq(members.systemId, systemId), eq(members.isArchived, 0), inArray(members.id, recentlyFrontedIds)),
        }).then((rows) =>
          recentlyFrontedIds
            .map((id) => rows.find((r) => r.id === id))
            .filter(Boolean) as typeof rows
        )
      : db.query.members.findMany({
          columns: { id: true, name: true, pronouns: true, color: true, avatarUrl: true, tags: true, createdAt: true },
          where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
          orderBy: (m, { desc: d }) => [d(m.createdAt)],
          limit: 5,
        }),
  ]);

  return (
    <HomeContent
      systemName={system?.name}
      memberCount={memberCountRow?.value ?? 0}
      journalCount={journalCountRow?.value ?? 0}
      noteCount={noteCountRow?.value ?? 0}
      friendCount={friendCountRow?.value ?? 0}
      partnerCount={partnerCountRow?.value ?? 0}
      frontingMembers={frontingMembers}
      recentMembers={recentMembers}
      hasFrontHistory={recentlyFrontedIds.length > 0}
    />
  );
}
