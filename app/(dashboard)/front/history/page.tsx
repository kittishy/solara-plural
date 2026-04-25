import { db } from '@/lib/db';
import { frontEntries, members } from '@/lib/db/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import FrontHistoryClient from './FrontHistoryClient';
import { safeParseMemberIds } from '@/lib/front';
import { requireSystemId } from '@/lib/auth/session';

export default async function FrontHistoryPage() {
  const systemId = await requireSystemId();

  const history = await db.query.frontEntries.findMany({
    columns: {
      id: true,
      memberIds: true,
      startedAt: true,
      endedAt: true,
      note: true,
    },
    where: and(
      eq(frontEntries.systemId, systemId),
      isNotNull(frontEntries.endedAt)
    ),
    orderBy: (f, { desc }) => [desc(f.startedAt)],
    limit: 50,
  });

  const parsedHistory = history.map((entry) => ({
    ...entry,
    memberIds: safeParseMemberIds(entry.memberIds),
  }));

  const allMemberIds = Array.from(new Set(parsedHistory.flatMap((h) => h.memberIds)));
  const allMembers = allMemberIds.length > 0
    ? await db.query.members.findMany({
        columns: {
          id: true,
          name: true,
          color: true,
          avatarUrl: true,
        },
        where: (m, { inArray }) => inArray(m.id, allMemberIds),
      })
    : [];

  return <FrontHistoryClient history={parsedHistory} members={allMembers} />;
}
