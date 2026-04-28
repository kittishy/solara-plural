import { db } from '@/lib/db';
import { members, frontEntries } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import FrontTracker from './FrontTracker';
import { requireSystemId } from '@/lib/auth/session';
import { Trans } from '@/components/language/Trans';

export default async function FrontPage() {
  const systemId = await requireSystemId();

  const [allMembers, activeFront] = await Promise.all([
    db.query.members.findMany({
      columns: {
        id: true,
        name: true,
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

  const parsedFront = activeFront
    ? { ...activeFront, memberIds: JSON.parse(activeFront.memberIds) as string[] }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text"><Trans k="front.pageTitle" /></h1>
        <p className="text-muted text-sm mt-0.5"><Trans k="front.pageSubtitle" /></p>
      </div>
      <FrontTracker members={allMembers} activeFront={parsedFront} />
    </div>
  );
}
