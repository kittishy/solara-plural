import { db } from '@/lib/db';
import { frontEntries, systemNotes, systems } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { requireSystemId } from '@/lib/auth/session';
import { DashboardGreeting, LocalizedTime, LocalizedToday } from '@/components/language/DashboardI18n';
import { Trans } from '@/components/language/Trans';

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

  const [system, activeFront, recentNotes] = await Promise.all([
    db.query.systems.findFirst({
      columns: {
        name: true,
      },
      where: eq(systems.id, systemId),
    }),
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
  ]);

  const fronting = activeFront ? (JSON.parse(activeFront.memberIds) as string[]) : [];
  const frontingMembers = fronting.length > 0
    ? await db.query.members.findMany({
        columns: {
          id: true,
          name: true,
          pronouns: true,
          color: true,
          avatarUrl: true,
        },
        where: (m, { inArray }) => inArray(m.id, fronting),
      })
    : [];

  return (
    <div className="animate-fade-in space-y-5 md:space-y-6">
      {/* Page header */}
      <section className="-mx-4 px-4 pt-4 pb-2 md:mx-0 md:px-0 md:pt-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          <LocalizedToday />
        </p>
        <h1 className="mt-1 text-3xl font-black leading-none tracking-tight text-text sm:text-4xl">
          <DashboardGreeting name={system?.name ?? 'friend'} />
        </h1>
      </section>

      {/* Front — hero banner when active, minimal card when not */}
      {frontingMembers.length > 0 && activeFront ? (
        <section
          className="-mx-4 md:mx-0 md:rounded-xl overflow-hidden"
          aria-labelledby="front-section-label"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--theme-front-soft-rgb) / 0.3) 0%, rgb(var(--theme-surface-rgb) / 0.95) 60%)',
            borderTop: '2px solid rgb(var(--theme-front-rgb) / 0.6)',
            borderBottom: '2px solid rgb(var(--theme-front-rgb) / 0.2)',
          }}
        >
          <div className="px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="relative inline-flex h-3 w-3 shrink-0" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-front opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-front shadow-[0_0_10px_rgba(244,114,182,0.9)]" />
                </span>
                <span id="front-section-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-front">
                  <Trans k="dashboard.currentFront" />
                </span>
              </div>
              <Link href="/front" className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-front/70 hover:text-front transition-colors">
                <Trans k="common.manage" /> <IconArrowRight />
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {frontingMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    background: `color-mix(in srgb, ${member.color ?? '#f472b6'} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${member.color ?? '#f472b6'} 35%, transparent)`,
                  }}
                >
                  {member.avatarUrl ? (
                    <DynamicAvatarImage src={member.avatarUrl} alt={member.name} className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black text-bg"
                      style={{ backgroundColor: member.color ?? '#f472b6' }}
                      aria-hidden="true"
                    >
                      {member.name[0].toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-black text-text leading-none">{member.name}</p>
                    {member.pronouns && (
                      <p className="text-xs text-muted leading-none mt-0.5">{member.pronouns}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-front/50 mt-3">
              <Trans k="dashboard.since" /> <LocalizedTime date={activeFront.startedAt} />
            </p>
          </div>
        </section>
      ) : (
        <section className="card p-4 md:p-5 border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-muted"><Trans k="dashboard.currentFront" /></h2>
              <p className="text-sm text-muted mt-1"><Trans k="dashboard.noCurrentFront" /></p>
            </div>
            <Link href="/front" className="btn-primary shrink-0 min-h-[44px]">
              <Trans k="dashboard.startFront" />
            </Link>
          </div>
        </section>
      )}

      <section className="card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text"><Trans k="dashboard.recentNotes" /></h2>
          <Link href="/notes" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-primary transition-colors hover:text-primary-glow">
            <Trans k="common.seeAll" /> <IconArrowRight />
          </Link>
        </div>

        {recentNotes.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted"><Trans k="dashboard.notesEmpty" /></p>
            <Link href="/notes/new" className="btn-ghost min-h-[44px] justify-center border border-border">
              <Trans k="dashboard.writeFirstNote" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block rounded-xl border border-border/60 bg-surface-alt/40 px-4 py-3 transition-all duration-150 hover:border-primary/30 hover:bg-surface-alt/70 hover:-translate-y-px active:scale-[0.99]"
              >
                <p className="line-clamp-1 text-sm font-medium text-text">{note.title ?? <Trans k="dashboard.untitledNote" />}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{note.content}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

