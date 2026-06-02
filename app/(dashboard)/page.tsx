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

  // Run all independent reads concurrently against the Postgres pool.
  const [
    [system],
    [memberCountRow],
    [activeFront],
    [journalCountRow],
    [noteCountRow],
    [friendCountRow],
    [partnerCountRow],
    recentHistory,
  ] = await Promise.all([
    db.select({ name: systems.name, description: systems.description })
      .from(systems).where(eq(systems.id, systemId)).limit(1),
    db.select({ value: count() }).from(members).where(
      and(eq(members.systemId, systemId), eq(members.isArchived, 0))
    ),
    db.select().from(frontEntries).where(
      and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt))
    ).limit(1),
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
    db.select({ memberIds: frontEntries.memberIds }).from(frontEntries)
      .where(eq(frontEntries.systemId, systemId))
      .orderBy(desc(frontEntries.startedAt))
      .limit(30),
  ]);

  const frontingIds = activeFront ? parseMemberIds(activeFront.memberIds) : [];

  // Compute recently fronted IDs from the history already fetched above.
  const recentlyFrontedIds: string[] = [];
  const seen = new Set<string>();
  for (const entry of recentHistory) {
    for (const id of safeParseMemberIds(entry.memberIds)) {
      if (!seen.has(id)) { seen.add(id); recentlyFrontedIds.push(id); }
      if (recentlyFrontedIds.length === 5) break;
    }
    if (recentlyFrontedIds.length === 5) break;
  }

  // Round 2 — fronting + recent member details. Also batched.
  const memberCols = {
    id: members.id,
    name: members.name,
    pronouns: members.pronouns,
    color: members.color,
    avatarUrl: members.avatarUrl,
  } as const;

  const memberColsWithTags = {
    ...memberCols,
    tags: members.tags,
    createdAt: members.createdAt,
  } as const;

  type FrontingMemberRow = {
    id: string; name: string; pronouns: string | null; color: string | null; avatarUrl: string | null;
  };
  type RecentMemberRow = FrontingMemberRow & { tags: string | null; createdAt: Date };

  let frontingMembers: FrontingMemberRow[] = [];
  let recentMembers: RecentMemberRow[] = [];

  if (frontingIds.length > 0 && recentlyFrontedIds.length > 0) {
    const [fronting, recent] = await Promise.all([
      db.select(memberCols).from(members).where(
        and(eq(members.systemId, systemId), inArray(members.id, frontingIds))
      ),
      db.select(memberColsWithTags).from(members).where(
        and(
          eq(members.systemId, systemId),
          eq(members.isArchived, 0),
          inArray(members.id, recentlyFrontedIds),
        )
      ),
    ]);
    frontingMembers = fronting;
    recentMembers = recentlyFrontedIds
      .map((id) => recent.find((r) => r.id === id))
      .filter(Boolean) as typeof recent;
  } else if (frontingIds.length > 0) {
    frontingMembers = await db.select(memberCols).from(members).where(
      and(eq(members.systemId, systemId), inArray(members.id, frontingIds))
    );
    recentMembers = await db.select(memberColsWithTags).from(members).where(
      and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
    ).orderBy(desc(members.createdAt)).limit(5);
  } else if (recentlyFrontedIds.length > 0) {
    const recent = await db.select(memberColsWithTags).from(members).where(
      and(
        eq(members.systemId, systemId),
        eq(members.isArchived, 0),
        inArray(members.id, recentlyFrontedIds),
      )
    );
    recentMembers = recentlyFrontedIds
      .map((id) => recent.find((r) => r.id === id))
      .filter(Boolean) as typeof recent;
  } else {
    recentMembers = await db.select(memberColsWithTags).from(members).where(
      and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
    ).orderBy(desc(members.createdAt)).limit(5);
  }

  // SSR snapshot of the current front entry, shaped for SWR fallbackData.
  const currentFrontSnapshot = activeFront
    ? {
        id: activeFront.id,
        memberIds: frontingIds,
        startedAt: (activeFront.startedAt as Date).toISOString(),
      }
    : null;

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
      currentFrontSnapshot={currentFrontSnapshot}
    />
  );
}
