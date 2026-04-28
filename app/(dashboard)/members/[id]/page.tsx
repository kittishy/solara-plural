import { db } from '@/lib/db';
import { members, frontEntries } from '@/lib/db/schema';
import { eq, and, desc, like } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireSystemId } from '@/lib/auth/session';

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const systemId = await requireSystemId();

  const { id } = await params;

  // Fetch member and their front history in parallel
  const [member, frontHistory] = await Promise.all([
    db.query.members.findFirst({
      columns: {
        id: true,
        systemId: true,
        name: true,
        pronouns: true,
        description: true,
        color: true,
        role: true,
        tags: true,
        notes: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      where: and(eq(members.id, id), eq(members.systemId, systemId)),
    }),
    db.query.frontEntries.findMany({
      columns: {
        id: true,
        startedAt: true,
        endedAt: true,
        note: true,
      },
      where: and(
        eq(frontEntries.systemId, systemId),
        // memberIds is a JSON string like '["id1","id2"]' — LIKE search is reliable for cuid2 IDs
        like(frontEntries.memberIds, `%"${id}"%`)
      ),
      orderBy: [desc(frontEntries.startedAt)],
      limit: 10,
    }),
  ]);

  if (!member) notFound();

  const tags = member.tags ? JSON.parse(member.tags) as string[] : [];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/members" className="btn-ghost">← Members</Link>
      </div>

      {/* Profile header */}
      <div className="card p-8 flex flex-col items-center text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-bg mb-4 shadow-glow overflow-hidden flex-shrink-0"
          style={!member.avatarUrl ? { backgroundColor: member.color ?? '#a78bfa' } : undefined}
          aria-hidden
        >
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            member.name[0].toUpperCase()
          )}
        </div>

        <h1 className="text-2xl font-bold text-text">{member.name}</h1>
        {member.pronouns && <p className="text-muted mt-1">{member.pronouns}</p>}
        {member.role && (
          <span className="mt-2 text-xs bg-primary/15 text-primary px-3 py-1 rounded-full">
            {member.role}
          </span>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            {tags.map((tag) => (
              <span key={tag} className="text-xs bg-surface-alt text-muted px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/members/${member.id}/edit`}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/50 bg-primary-soft px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_0_24px_rgba(167,139,250,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Edit profile
        </Link>
      </div>

      {/* Description */}
      {member.description && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">About</h2>
          <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{member.description}</p>
        </div>
      )}

      {/* Private notes */}
      {member.notes && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Private notes</h2>
          <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{member.notes}</p>
        </div>
      )}

      {/* Front history */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Front history</h2>

        {frontHistory.length === 0 ? (
          <p className="text-muted text-sm">No front history yet 💜</p>
        ) : (
          <>
            <div className="space-y-3">
              {frontHistory.map((entry) => {
                const start = new Date(entry.startedAt);
                const end = entry.endedAt ? new Date(entry.endedAt) : null;
                return (
                  <div key={entry.id} className="bg-surface-alt rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-text text-sm font-medium">
                          {start.toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                        <p className="text-muted text-xs mt-0.5">
                          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {end && (
                            <> → {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
                          )}
                        </p>
                      </div>
                      {end && (
                        <span className="text-xs text-subtle bg-surface rounded-full px-2.5 py-1 flex-shrink-0">
                          {formatDuration(start, end)}
                        </span>
                      )}
                      {!end && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-front flex-shrink-0">
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-front" />
                          Now
                        </span>
                      )}
                    </div>
                    {entry.note && (
                      <p className="text-muted text-xs mt-2 italic">&ldquo;{entry.note}&rdquo;</p>
                    )}
                  </div>
                );
              })}
            </div>
            {frontHistory.length === 10 && (
              <p className="text-subtle text-xs mt-4 text-center">Showing last 10 sessions</p>
            )}
          </>
        )}
      </div>

      {/* Meta */}
      <div className="card p-4 text-xs text-subtle space-y-1">
        <p>Added {new Date(member.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        {member.updatedAt > member.createdAt && (
          <p>Last updated {new Date(member.updatedAt).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}
