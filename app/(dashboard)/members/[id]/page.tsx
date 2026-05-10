import { db } from '@/lib/db';
import { members, frontEntries } from '@/lib/db/schema';
import { eq, and, desc, like } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
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

function IconChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const systemId = await requireSystemId();
  const { id } = await params;

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
        like(frontEntries.memberIds, `%"${id}"%`)
      ),
      orderBy: [desc(frontEntries.startedAt)],
      limit: 10,
    }),
  ]);

  if (!member) notFound();

  const tags = member.tags ? JSON.parse(member.tags) as string[] : [];
  const accentColor = member.color ?? '#a78bfa';

  return (
    <div className="animate-fade-in space-y-5">
      {/* Back nav */}
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
      >
        <IconChevronLeft />
        Members
      </Link>

      {/* Profile header */}
      <div
        className="rounded-xl overflow-hidden border border-border/40 bg-surface"
        style={{ borderLeft: `4px solid ${accentColor}` }}
      >
        <div className="flex items-center gap-4 px-5 py-5">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center
              text-3xl font-bold text-bg shadow-sm"
            style={!member.avatarUrl ? { backgroundColor: accentColor } : undefined}
            aria-hidden="true"
          >
            {member.avatarUrl ? (
              <DynamicAvatarImage
                src={member.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              member.name[0].toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text leading-snug">{member.name}</h1>
            {member.pronouns && (
              <p className="text-muted text-sm mt-0.5">{member.pronouns}</p>
            )}
            {member.role && (
              <span className="mt-2 inline-block text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full">
                {member.role}
              </span>
            )}
          </div>

          {/* Edit */}
          <Link
            href={`/members/${member.id}/edit`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 min-h-[40px] rounded-lg
              border border-border/60 bg-surface-alt px-4 py-2 text-sm font-medium text-muted
              transition-colors hover:border-primary/40 hover:text-text"
          >
            <IconEdit />
            Edit
          </Link>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 py-3 border-t border-border/40 bg-surface-alt/30">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-surface-alt text-muted px-2.5 py-1 rounded-full border border-border/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      {member.description && (
        <div className="rounded-xl border border-border/40 bg-surface px-5 py-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">About</h2>
          <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{member.description}</p>
        </div>
      )}

      {/* Private notes */}
      {member.notes && (
        <div className="rounded-xl border border-border/40 bg-surface px-5 py-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Private notes</h2>
          <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{member.notes}</p>
        </div>
      )}

      {/* Front history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text">Front history</h2>
          {frontHistory.length === 10 && (
            <span className="text-subtle text-xs">Last 10 sessions</span>
          )}
        </div>

        {frontHistory.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-surface px-5 py-8 text-center">
            <p className="text-muted text-sm">No front history yet</p>
          </div>
        ) : (
          <ul role="list" className="rounded-xl overflow-hidden border border-border/40">
            {frontHistory.map((entry) => {
              const start = new Date(entry.startedAt);
              const end = entry.endedAt ? new Date(entry.endedAt) : null;
              const isLive = !end;

              return (
                <li
                  key={entry.id}
                  role="listitem"
                  className="border-b border-border/40 last:border-b-0 bg-surface hover:bg-surface-alt/60 transition-colors duration-150"
                  style={{ borderLeft: `3px solid ${accentColor}` }}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {start.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {end && (
                          <> → {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
                        )}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-muted mt-1 italic">&ldquo;{entry.note}&rdquo;</p>
                      )}
                    </div>

                    {isLive ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0" aria-label="Currently fronting">
                        <span className="relative inline-flex h-2 w-2 flex-shrink-0" aria-hidden="true">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-front opacity-60 animate-pulse" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-front" />
                        </span>
                        <span className="text-xs font-semibold text-front">Now</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted bg-surface-alt rounded-full px-2.5 py-1 flex-shrink-0 border border-border/40">
                        {formatDuration(start, end!)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-border/40 bg-surface px-5 py-3 text-xs text-subtle space-y-1">
        <p>Added {new Date(member.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        {member.updatedAt > member.createdAt && (
          <p>Last updated {new Date(member.updatedAt).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}
