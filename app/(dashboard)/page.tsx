import { db } from '@/lib/db';
import { members, frontEntries, systemNotes, systems } from '@/lib/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import Link from 'next/link';
import { requireSystemId } from '@/lib/auth/session';

export default async function DashboardPage() {
  const systemId = await requireSystemId();

  const [system, activeFront, recentNotes, memberCount, noteCount] = await Promise.all([
    db.query.systems.findFirst({ where: eq(systems.id, systemId) }),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
    db.query.systemNotes.findMany({
      columns: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
      },
      where: eq(systemNotes.systemId, systemId),
      orderBy: (n, { desc }) => [desc(n.updatedAt)],
      limit: 3,
    }),
    db.$count(members, and(eq(members.systemId, systemId), eq(members.isArchived, 0))),
    db.$count(systemNotes, eq(systemNotes.systemId, systemId)),
  ]);

  const fronting = activeFront
    ? (JSON.parse(activeFront.memberIds) as string[])
    : [];

  const frontingMembers = fronting.length > 0
    ? await db.query.members.findMany({
        columns: {
          id: true,
          name: true,
          pronouns: true,
          color: true,
        },
        where: (m, { inArray }) => inArray(m.id, fronting),
      })
    : [];

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 6  ? 'Good night'      :
    hour < 12 ? 'Good morning'    :
    hour < 17 ? 'Good afternoon'  :
    hour < 21 ? 'Good evening'    :
                'Good night';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-text">
          {greeting}, {system?.name ?? 'friend'} 💜
        </h1>
        <p className="text-muted mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">Members</p>
          <p className="text-2xl font-bold text-text mt-1">{memberCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">Notes</p>
          <p className="text-2xl font-bold text-text mt-1">{noteCount}</p>
        </div>
        <div className="card p-4 col-span-2 md:col-span-1">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">Currently fronting</p>
          <p className="text-2xl font-bold text-text mt-1">{frontingMembers.length}</p>
        </div>
      </div>

      {/* Front Tracker */}
      <div className={`card p-6 ${activeFront ? 'border-front/30 shadow-front-glow' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            {activeFront && (
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-front" />
            )}
            Currently Fronting
          </h2>
          <Link href="/front" className="text-primary text-sm hover:text-primary-glow transition-colors duration-100">
            Manage →
          </Link>
        </div>

        {frontingMembers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {frontingMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 bg-surface-alt rounded-full px-3 py-1.5"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg"
                  style={{ backgroundColor: m.color ?? '#a78bfa' }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-text">{m.name}</span>
                {m.pronouns && (
                  <span className="text-xs text-muted">{m.pronouns}</span>
                )}
              </div>
            ))}
            {activeFront && (
              <p className="w-full text-xs text-muted mt-2">
                Since {new Date(activeFront.startedAt).toLocaleTimeString('en-US', {
                  hour: 'numeric', minute: '2-digit'
                })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm">
            No one is listed as fronting right now.{' '}
            <Link href="/front" className="text-primary hover:underline">Want to add someone?</Link>
          </p>
        )}
      </div>

      {/* Recent Notes */}
      {recentNotes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text">Recent Notes</h2>
            <Link href="/notes" className="text-primary text-sm hover:text-primary-glow transition-colors duration-100">
              See all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="card p-4 block hover:shadow-glow transition-shadow duration-100"
              >
                <p className="font-medium text-text text-sm">{note.title ?? 'Untitled note'}</p>
                <p className="text-muted text-xs mt-1 line-clamp-2">{note.content}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
