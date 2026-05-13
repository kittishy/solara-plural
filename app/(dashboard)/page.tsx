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

function IconPlus() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
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
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            <Trans k="dashboard.systemSummary" />
          </span>
          <span className="flex-1 h-px bg-border-strong/50" aria-hidden="true" />
        </div>

        <h1 className="text-3xl font-black leading-none tracking-tight text-text sm:text-4xl">
          <DashboardGreeting name={system?.name ?? 'friend'} />
        </h1>
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          <LocalizedToday />
        </p>
      </section>

      {/* Front section */}
      {frontingMembers.length > 0 && activeFront ? (
        <section
          aria-labelledby="front-section-label"
          className="relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--theme-front-soft-rgb) / 0.2) 0%, rgb(var(--theme-surface-rgb)) 60%)',
            borderLeft: '3px solid rgb(var(--theme-front-rgb))',
            padding: '1rem 1.25rem',
          }}
        >
          {/* Corner ornaments */}
          <span
            className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-front/50"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute bottom-0 right-0 block w-3 h-3 border-b-2 border-r-2 border-front/30"
            aria-hidden="true"
          />

          {/* Header row */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex h-3 w-3 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-front opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-front shadow-front-glow" />
              </span>
              <span
                id="front-section-label"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-front"
              >
                <Trans k="dashboard.currentFront" />
              </span>
            </div>
            <Link
              href="/front"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-front/60 hover:text-front transition-colors"
            >
              <Trans k="common.manage" />
              <IconArrowRight />
            </Link>
          </div>

          {/* Member cards */}
          <div className="flex flex-wrap gap-3">
            {frontingMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-3 py-2.5 min-w-[160px]"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${member.color ?? '#c084fc'} 25%, #100c1e) 0%, #100c1e 100%)`,
                  borderLeft: `3px solid ${member.color ?? 'rgb(var(--theme-front-rgb))'}`,
                  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                }}
              >
                {member.avatarUrl ? (
                  <div
                    className="h-9 w-9 flex-shrink-0 overflow-hidden"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}
                  >
                    <DynamicAvatarImage
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-9 w-9 object-cover"
                    />
                  </div>
                ) : (
                  <span
                    className="flex h-9 w-9 items-center justify-center text-sm font-black text-bg flex-shrink-0"
                    style={{
                      backgroundColor: member.color ?? '#c084fc',
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
                    }}
                    aria-hidden="true"
                  >
                    {member.name[0].toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-sm font-black text-text leading-none">{member.name}</p>
                  {member.pronouns && (
                    <p className="text-[10px] text-muted leading-none mt-0.5 font-black uppercase tracking-wider">
                      {member.pronouns}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Since timestamp */}
          <p className="text-[10px] font-black uppercase tracking-widest text-front/50 mt-3">
            <Trans k="dashboard.since" />{' '}
            <LocalizedTime date={activeFront.startedAt} />
          </p>
        </section>
      ) : (
        <section
          className="relative overflow-hidden"
          style={{
            background: 'rgb(var(--theme-surface-rgb))',
            borderLeft: '3px solid rgb(var(--theme-border-strong-rgb))',
            padding: '1rem 1.25rem',
          }}
        >
          {/* Corner ornament */}
          <span
            className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-border-strong/50"
            aria-hidden="true"
          />

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                <Trans k="dashboard.currentFront" />
              </h2>
              <p className="text-sm text-muted mt-1.5 font-bold">
                <Trans k="dashboard.noCurrentFront" />
              </p>
            </div>
            <Link
              href="/front"
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-150 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              style={{
                background: 'rgb(var(--theme-primary-rgb))',
                color: 'rgb(var(--theme-bg-rgb))',
                clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
            >
              <IconPlus />
              <Trans k="dashboard.startFront" />
            </Link>
          </div>
        </section>
      )}

      {/* Recent Notes */}
      <section>
        {/* Section header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              <Trans k="dashboard.recentNotes" />
            </h2>
          </div>
          <Link
            href="/notes"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
          >
            <Trans k="common.seeAll" />
            <IconArrowRight />
          </Link>
        </div>

        {recentNotes.length === 0 ? (
          <div
            className="relative overflow-hidden py-6 px-5"
            style={{
              background: 'rgb(var(--theme-surface-rgb))',
              borderLeft: '3px solid rgb(var(--theme-border-strong-rgb))',
            }}
          >
            <span
              className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-border-strong/50"
              aria-hidden="true"
            />
            <p className="text-sm text-muted mb-4">
              <Trans k="dashboard.notesEmpty" />
            </p>
            <Link
              href="/notes/new"
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-150 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              style={{
                background: 'rgb(var(--theme-primary-rgb))',
                color: 'rgb(var(--theme-bg-rgb))',
                clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
            >
              <IconPlus />
              <Trans k="dashboard.writeFirstNote" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block relative overflow-hidden transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_0_1px_rgb(var(--theme-primary-rgb)/0.3),0_8px_24px_rgba(0,0,0,0.7)]"
                style={{
                  background: 'rgb(var(--theme-surface-alt-rgb))',
                  borderLeft: '3px solid rgb(var(--theme-primary-rgb))',
                  padding: '0.75rem 1rem',
                }}
              >
                {/* Corner ornament */}
                <span
                  className="pointer-events-none absolute top-0 right-0 block w-2.5 h-2.5 border-t border-r border-primary/30"
                  aria-hidden="true"
                />
                <p className="text-sm font-black text-text line-clamp-1">
                  {note.title ?? <Trans k="dashboard.untitledNote" />}
                </p>
                <p className="text-xs text-muted mt-1 line-clamp-2">{note.content}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
