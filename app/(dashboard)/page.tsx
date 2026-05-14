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
      columns: { name: true },
      where: eq(systems.id, systemId),
    }),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
    db.query.systemNotes.findMany({
      columns: { id: true, title: true, content: true, updatedAt: true },
      where: eq(systemNotes.systemId, systemId),
      orderBy: (n, { desc }) => [desc(n.updatedAt)],
      limit: 3,
    }),
  ]);

  const fronting = activeFront ? (JSON.parse(activeFront.memberIds) as string[]) : [];
  const frontingMembers = fronting.length > 0
    ? await db.query.members.findMany({
        columns: { id: true, name: true, pronouns: true, color: true, avatarUrl: true },
        where: (m, { inArray }) => inArray(m.id, fronting),
      })
    : [];

  return (
    <div className="animate-fade-in space-y-5 md:space-y-6">
      {/* Page header */}
      <section className="-mx-4 px-4 pt-4 pb-2 md:mx-0 md:px-0 md:pt-0">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: 'var(--theme-primary)', fontSize: '0.5rem' }} aria-hidden="true">◆</span>
          <span
            style={{
              color: 'var(--theme-muted)',
              fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            <Trans k="dashboard.systemSummary" />
          </span>
          <span className="flex-1 h-px" style={{ background: 'var(--theme-border)' }} aria-hidden="true" />
        </div>

        <h1
          className="leading-none"
          style={{
            fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
            fontWeight: 900,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: 'var(--theme-text)',
          }}
        >
          <DashboardGreeting name={system?.name ?? 'friend'} />
        </h1>
        <p
          className="mt-1.5"
          style={{
            color: 'var(--theme-muted)',
            fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          <LocalizedToday />
        </p>
      </section>

      {/* Front section */}
      {frontingMembers.length > 0 && activeFront ? (
        <section
          aria-labelledby="front-section-label"
          className="card card-featured relative overflow-hidden"
          style={{ padding: '1.25rem' }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex h-3 w-3 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: 'var(--theme-primary)', opacity: 0.6 }} />
                <span className="relative inline-flex h-3 w-3 rounded-full" style={{ background: 'var(--theme-primary)' }} />
              </span>
              <span
                id="front-section-label"
                style={{
                  color: 'var(--theme-primary)',
                  fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                <Trans k="dashboard.currentFront" />
              </span>
            </div>
            <Link
              href="/front"
              className="inline-flex min-h-[44px] items-center gap-1.5 transition-colors"
              style={{
                color: 'rgb(var(--theme-primary-rgb) / 0.6)',
                fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--theme-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--theme-primary-rgb) / 0.6)'; }}
            >
              <Trans k="common.manage" />
              <IconArrowRight />
            </Link>
          </div>

          {/* Member cards */}
          <div className="flex flex-wrap gap-3 relative z-10">
            {frontingMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-3 py-2.5 min-w-[160px]"
                style={{
                  background: 'var(--theme-surface-alt)',
                  border: `2px solid ${member.color ?? 'var(--theme-primary)'}`,
                  borderRadius: '14px',
                }}
              >
                {member.avatarUrl ? (
                  <div
                    className="h-9 w-9 flex-shrink-0 overflow-hidden"
                    style={{ borderRadius: '8px' }}
                  >
                    <DynamicAvatarImage
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-9 w-9 object-cover"
                    />
                  </div>
                ) : (
                  <span
                    className="flex h-9 w-9 items-center justify-center text-sm font-black flex-shrink-0"
                    style={{
                      backgroundColor: member.color ?? 'var(--theme-primary)',
                      color: '#131416',
                      borderRadius: '8px',
                    }}
                    aria-hidden="true"
                  >
                    {member.name[0].toUpperCase()}
                  </span>
                )}
                <div>
                  <p
                    className="leading-none"
                    style={{
                      color: 'var(--theme-text)',
                      fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {member.name}
                  </p>
                  {member.pronouns && (
                    <p
                      className="leading-none mt-0.5"
                      style={{
                        color: 'var(--theme-muted)',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {member.pronouns}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Since timestamp */}
          <p
            className="mt-3 relative z-10"
            style={{
              color: 'rgb(var(--theme-primary-rgb) / 0.5)',
              fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            <Trans k="dashboard.since" />{' '}
            <LocalizedTime date={activeFront.startedAt} />
          </p>
        </section>
      ) : (
        <section className="card relative overflow-hidden" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div>
              <h2
                style={{
                  color: 'var(--theme-muted)',
                  fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                <Trans k="dashboard.currentFront" />
              </h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--theme-muted)' }}>
                <Trans k="dashboard.noCurrentFront" />
              </p>
            </div>
            <Link
              href="/front"
              className="btn-primary inline-flex items-center gap-2"
            >
              <IconPlus />
              <Trans k="dashboard.startFront" />
            </Link>
          </div>
        </section>
      )}

      {/* Recent Notes */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--theme-primary)', fontSize: '0.5rem' }} aria-hidden="true">◆</span>
            <h2
              style={{
                color: 'var(--theme-muted)',
                fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              <Trans k="dashboard.recentNotes" />
            </h2>
          </div>
          <Link
            href="/notes"
            className="inline-flex min-h-[44px] items-center gap-1.5 transition-colors"
            style={{
              color: 'rgb(var(--theme-primary-rgb) / 0.6)',
              fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            <Trans k="common.seeAll" />
            <IconArrowRight />
          </Link>
        </div>

        {recentNotes.length === 0 ? (
          <div className="card relative overflow-hidden" style={{ padding: '1.5rem 1.25rem' }}>
            <p className="text-sm mb-4 relative z-10" style={{ color: 'var(--theme-muted)' }}>
              <Trans k="dashboard.notesEmpty" />
            </p>
            <Link
              href="/notes/new"
              className="btn-primary inline-flex items-center gap-2 relative z-10"
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
                className="card block transition-all duration-150"
                style={{ padding: '0.875rem 1.1rem' }}
              >
                <p
                  className="line-clamp-1 relative z-10"
                  style={{
                    color: 'var(--theme-text)',
                    fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  {note.title ?? <Trans k="dashboard.untitledNote" />}
                </p>
                <p className="text-xs mt-1 line-clamp-2 relative z-10" style={{ color: 'var(--theme-muted)' }}>
                  {note.content}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
