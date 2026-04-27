import { db } from '@/lib/db';
import { frontEntries, members, systemNotes, systems } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { requireSystemId } from '@/lib/auth/session';

function IconArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

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

  const fronting = activeFront ? (JSON.parse(activeFront.memberIds) as string[]) : [];
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

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? 'Good night' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' :
    'Good night';

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="-mx-4 px-4 py-4 md:mx-0 md:px-0 md:py-0">
        <p className="text-sm font-medium text-muted">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-text sm:text-3xl">
          {greeting}, {system?.name ?? 'friend'}
        </h1>
      </section>

      <section aria-label="Quick navigation" className="grid grid-cols-2 gap-3 md:hidden">
        <HomeTile href="/front" label="Front" detail={frontingMembers.length > 0 ? `${frontingMembers.length} active` : 'Start or switch'} />
        <HomeTile href="/members" label="Members" detail={`${memberCount} saved`} />
        <HomeTile href="/notes/new" label="New note" detail="Capture context" />
        <HomeTile href="/front/history" label="History" detail="Edit past entries" />
        <HomeTile href="/friends" label="Friends" detail="Invite and connect" />
      </section>

      <section aria-label="System summary" className="grid grid-cols-3 gap-2 md:gap-3">
        <StatCard href="/members" label="Members" value={memberCount} />
        <StatCard href="/notes" label="Notes" value={noteCount} />
        <StatCard href="/front" label="Front" value={frontingMembers.length} active={frontingMembers.length > 0} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className={`card p-5 md:p-6 ${activeFront ? 'border-front/40 shadow-front-glow' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text">Current front</h2>
            <Link href="/front" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-primary transition-colors hover:text-primary-glow">
              Manage <IconArrowRight />
            </Link>
          </div>

          {frontingMembers.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {frontingMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 rounded-full border border-border/50 bg-surface-alt px-3 py-1.5">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-bg"
                      style={{ backgroundColor: member.color ?? '#a78bfa' }}
                      aria-hidden="true"
                    >
                      {member.name[0].toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-text">{member.name}</span>
                    {member.pronouns && <span className="text-xs text-muted">{member.pronouns}</span>}
                  </div>
                ))}
              </div>
              {activeFront && (
                <p className="text-sm text-muted">
                  Since {new Date(activeFront.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">No one is listed as fronting right now.</p>
              <Link href="/front" className="btn-primary min-h-[44px] justify-center md:w-auto">
                Start front
              </Link>
            </div>
          )}
        </section>

        <section className="hidden md:block card p-6">
          <h2 className="mb-3 text-lg font-semibold text-text">Quick actions</h2>
          <div className="grid gap-2">
            <QuickAction href="/members/new" label="Add member" />
            <QuickAction href="/front" label="Start front session" />
            <QuickAction href="/notes/new" label="Write note" />
            <QuickAction href="/front/history" label="Front history" />
            <QuickAction href="/friends" label="Friends" />
            <QuickAction href="/settings" label="Settings" />
          </div>
        </section>
      </div>

      <section className="card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Recent notes</h2>
          <Link href="/notes" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-primary transition-colors hover:text-primary-glow">
            See all <IconArrowRight />
          </Link>
        </div>

        {recentNotes.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted">Notes you write will live here.</p>
            <Link href="/notes/new" className="btn-ghost min-h-[44px] justify-center border border-border">
              Write first note
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block rounded-xl border border-border/60 bg-surface-alt/40 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-surface-alt/70"
              >
                <p className="line-clamp-1 text-sm font-medium text-text">{note.title ?? 'Untitled note'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{note.content}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HomeTile({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link href={href} className="min-h-[76px] rounded-xl border border-border bg-surface px-4 py-3 transition-colors active:bg-surface-alt">
      <span className="block text-base font-semibold text-text">{label}</span>
      <span className="mt-1 block text-sm text-muted">{detail}</span>
    </Link>
  );
}

function StatCard({ href, label, value, active = false }: { href: string; label: string; value: number; active?: boolean }) {
  return (
    <Link href={href} className={`card p-3 md:p-4 transition-all hover:shadow-glow ${active ? 'border-front/40 shadow-front-glow' : ''}`}>
      <p className="text-xs font-semibold text-muted md:uppercase md:tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold md:text-3xl ${active ? 'text-front' : 'text-text'}`}>{value}</p>
    </Link>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-ghost min-h-[44px] justify-between border border-border">
      <span>{label}</span>
      <IconArrowRight />
    </Link>
  );
}
