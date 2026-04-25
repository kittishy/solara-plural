import { db } from '@/lib/db';
import { members, frontEntries } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireSystemId } from '@/lib/auth/session';
import MembersClient from './MembersClient';

export default async function MembersPage() {
  const systemId = await requireSystemId();

  // Fetch members and active front in parallel — single round-trip
  const [allMembers, activeFront] = await Promise.all([
    db.query.members.findMany({
      columns: {
        id: true,
        name: true,
        pronouns: true,
        role: true,
        tags: true,
        color: true,
        avatarUrl: true,
      },
      where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
      orderBy: (m, { asc }) => [asc(m.name)],
    }),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
  ]);

  const parsedMembers = allMembers.map((m) => ({
    ...m,
    tags: m.tags ? JSON.parse(m.tags) as string[] : [],
  }));

  const parsedFront = activeFront
    ? { ...activeFront, memberIds: JSON.parse(activeFront.memberIds) as string[] }
    : null;

  return <MembersClient initialMembers={parsedMembers} initialFront={parsedFront} />;
}
