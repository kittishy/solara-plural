import { db } from '@/lib/db';
import { frontEntries, members } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
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

  const allMembers = await db.query.members.findMany({
    columns: {
      id: true,
      name: true,
      color: true,
      avatarUrl: true,
    },
    where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
    orderBy: (m, { asc }) => [asc(m.name)],
  });

  return <FrontHistoryClient history={parsedHistory} members={allMembers} />;
}
