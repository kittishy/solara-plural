import { db } from '@/lib/db';
import {
  frontEntries,
  systemNotes,
  systems,
  systemPartnerships,
  systemFriendships,
} from '@/lib/db/schema';
import { and, eq, isNull, or, inArray, desc } from 'drizzle-orm';
import Link from 'next/link';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { getAccountType, requireSystemId } from '@/lib/auth/session';
import { DashboardGreeting, LocalizedTime, LocalizedToday } from '@/components/language/DashboardI18n';
import { Trans } from '@/components/language/Trans';
import type { TranslationKey } from '@/lib/i18n';

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

type OtherSystem = {
  id: string;
  name: string;
  avatarMode: string;
  avatarEmoji: string;
  avatarUrl: string | null;
};

function SystemAvatar({ system, size = 40 }: { system: OtherSystem; size?: number }) {
  const dim = `${size}px`;
  if (system.avatarMode === 'url' && system.avatarUrl) {
    return (
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          width: dim,
          height: dim,
          clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
        }}
      >
        <DynamicAvatarImage
          src={system.avatarUrl}
          alt={system.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex-shrink-0 flex items-center justify-center bg-surface-alt"
      style={{
        width: dim,
        height: dim,
        fontSize: size <= 30 ? '14px' : '18px',
        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
      }}
    >
      {system.avatarEmoji || '✦'}
    </span>
  );
}

export default async function DashboardPage() {
  const systemId = await requireSystemId();
  const accountType = await getAccountType();

  // Account-info + notes are useful for both
  const [user, recentNotes] = await Promise.all([
    db.query.systems.findFirst({
      columns: { name: true },
      where: eq(systems.id, systemId),
    }),
    db.query.systemNotes.findMany({
      columns: { id: true, title: true, content: true, updatedAt: true },
      where: eq(systemNotes.systemId, systemId),
      orderBy: (n, { desc: d }) => [d(n.updatedAt)],
      limit: 3,
    }),
  ]);

  if (accountType === 'singlet') {
    return <SingletDashboard userName={user?.name ?? 'friend'} systemId={systemId} recentNotes={recentNotes} />;
  }

  // System dashboard (existing layout)
  const [activeFront] = await Promise.all([
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
  ]);

  const fronting = activeFront ? (JSON.parse(activeFront.memberIds) as string[]) : [];
  const frontingMembers = fronting.length > 0
    ? await db.query.members.findMany({
        columns: { id: true, name: true, pronouns: true, color: true, avatarUrl: true },
        where: (m, { inArray: ia }) => ia(m.id, fronting),
      })
    : [];

  return (
    <div className="stagger-children space-y-5 md:space-y-6">
      <section className="-mx-4 px-4 pt-4 pb-2 md:mx-0 md:px-0 md:pt-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            <Trans k="dashboard.systemSummary" />
          </span>
          <span className="flex-1 h-px bg-border-strong/50" aria-hidden="true" />
        </div>

        <h1 className="text-3xl font-black leading-none tracking-tight text-text sm:text-4xl">
          <DashboardGreeting name={user?.name ?? 'friend'} />
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
          <span className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-front/50" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-0 right-0 block w-3 h-3 border-b-2 border-r-2 border-front/30" aria-hidden="true" />

          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex h-3 w-3 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-front opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-front shadow-front-glow" />
              </span>
              <span id="front-section-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-front">
                <Trans k="dashboard.currentFront" />
              </span>
            </div>
            <Link href="/front"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-front/60 hover:text-front transition-colors"
            >
              <Trans k="common.manage" />
              <IconArrowRight />
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            {frontingMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 min-w-[160px]"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${member.color ?? '#c084fc'} 25%, #100c1e) 0%, #100c1e 100%)`,
                  borderLeft: `3px solid ${member.color ?? 'rgb(var(--theme-front-rgb))'}`,
                  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                }}
              >
                {member.avatarUrl ? (
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}
                  >
                    <DynamicAvatarImage src={member.avatarUrl} alt={member.name} className="h-9 w-9 object-cover" />
                  </div>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center text-sm font-black text-bg flex-shrink-0"
                    style={{ backgroundColor: member.color ?? '#c084fc', clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}
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

          <p className="text-[10px] font-black uppercase tracking-widest text-front/50 mt-3">
            <Trans k="dashboard.since" />{' '}
            <LocalizedTime date={activeFront.startedAt} />
          </p>
        </section>
      ) : (
        <section className="relative overflow-hidden"
          style={{
            background: 'rgb(var(--theme-surface-rgb))',
            borderLeft: '3px solid rgb(var(--theme-border-strong-rgb))',
            padding: '1rem 1.25rem',
          }}
        >
          <span className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-border-strong/50" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                <Trans k="dashboard.currentFront" />
              </h2>
              <p className="text-sm text-muted mt-1.5 font-bold">
                <Trans k="dashboard.noCurrentFront" />
              </p>
            </div>
            <Link href="/front"
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

      <RecentNotesSection recentNotes={recentNotes} />
    </div>
  );
}

// ─── Singlet Dashboard ───────────────────────────────────────────────────────

async function SingletDashboard({
  userName,
  systemId,
  recentNotes,
}: {
  userName: string;
  systemId: string;
  recentNotes: { id: string; title: string | null; content: string; updatedAt: Date }[];
}) {
  // Fetch partnerships and friendships involving this user
  const [partnerships, friendships] = await Promise.all([
    db
      .select({
        id: systemPartnerships.id,
        systemAId: systemPartnerships.systemAId,
        systemBId: systemPartnerships.systemBId,
        relationshipLabel: systemPartnerships.relationshipLabel,
        partneredSince: systemPartnerships.partneredSince,
        nicknameForA: systemPartnerships.nicknameForA,
        nicknameForB: systemPartnerships.nicknameForB,
        createdAt: systemPartnerships.createdAt,
      })
      .from(systemPartnerships)
      .where(or(eq(systemPartnerships.systemAId, systemId), eq(systemPartnerships.systemBId, systemId)))
      .orderBy(desc(systemPartnerships.createdAt))
      .limit(4),
    db
      .select({
        id: systemFriendships.id,
        systemAId: systemFriendships.systemAId,
        systemBId: systemFriendships.systemBId,
        createdAt: systemFriendships.createdAt,
      })
      .from(systemFriendships)
      .where(or(eq(systemFriendships.systemAId, systemId), eq(systemFriendships.systemBId, systemId)))
      .orderBy(desc(systemFriendships.createdAt))
      .limit(6),
  ]);

  // Collect IDs of "other" systems involved
  const otherIds = new Set<string>();
  for (const p of partnerships) {
    otherIds.add(p.systemAId === systemId ? p.systemBId : p.systemAId);
  }
  for (const f of friendships) {
    otherIds.add(f.systemAId === systemId ? f.systemBId : f.systemAId);
  }

  const otherSystems = otherIds.size > 0
    ? await db.query.systems.findMany({
        columns: { id: true, name: true, avatarMode: true, avatarEmoji: true, avatarUrl: true },
        where: (s) => inArray(s.id, Array.from(otherIds)),
      })
    : [];
  const systemMap = new Map(otherSystems.map((s) => [s.id, s]));

  const partnersWithInfo = partnerships
    .map((p) => {
      const otherId = p.systemAId === systemId ? p.systemBId : p.systemAId;
      const other = systemMap.get(otherId);
      if (!other) return null;
      return {
        partnershipId: p.id,
        otherSystem: other,
        relationshipLabel: p.relationshipLabel,
        partneredSince: p.partneredSince,
        nickname: p.systemAId === systemId ? p.nicknameForB : p.nicknameForA,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const friendsWithInfo = friendships
    .map((f) => {
      const otherId = f.systemAId === systemId ? f.systemBId : f.systemAId;
      const other = systemMap.get(otherId);
      if (!other) return null;
      return { friendshipId: f.id, otherSystem: other };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return (
    <div className="stagger-children space-y-5 md:space-y-6">
      {/* Page header */}
      <section className="-mx-4 px-4 pt-4 pb-2 md:mx-0 md:px-0 md:pt-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            <Trans k="dashboard.yourSpace" />
          </span>
          <span className="flex-1 h-px bg-border-strong/50" aria-hidden="true" />
        </div>

        <h1 className="text-3xl font-black leading-none tracking-tight text-text sm:text-4xl">
          <DashboardGreeting name={userName} />
        </h1>
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          <LocalizedToday />
        </p>
      </section>

      {/* Partners section */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              <Trans k="dashboard.yourPartners" />
            </h2>
          </div>
          {partnersWithInfo.length > 0 && (
            <Link href="/partners"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
            >
              <Trans k="common.seeAll" />
              <IconArrowRight />
            </Link>
          )}
        </div>

        {partnersWithInfo.length === 0 ? (
          <EmptyCallout
            messageKey="dashboard.partnersEmpty"
            ctaKey="dashboard.findPartners"
            href="/partners"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {partnersWithInfo.map((p) => (
              <Link key={p.partnershipId} href={`/partners/${p.partnershipId}`}
                className="group block relative overflow-hidden transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_0_1px_rgb(var(--theme-primary-rgb)/0.3),0_8px_24px_rgba(0,0,0,0.7)]"
                style={{
                  background: 'rgb(var(--theme-surface-alt-rgb))',
                  borderLeft: '3px solid rgb(var(--theme-primary-rgb))',
                  padding: '0.85rem 1rem',
                }}
              >
                <span className="pointer-events-none absolute top-0 right-0 block w-2.5 h-2.5 border-t border-r border-primary/40" aria-hidden="true" />
                <div className="flex items-center gap-3">
                  <SystemAvatar system={p.otherSystem} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-text leading-tight truncate">
                      {p.nickname || p.otherSystem.name}
                    </p>
                    {p.relationshipLabel ? (
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary/80 mt-0.5 truncate">
                        {p.relationshipLabel}
                      </p>
                    ) : p.partneredSince ? (
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted mt-0.5">
                        <Trans k="dashboard.partnerSince" />{' '}
                        <LocalizedTime date={p.partneredSince} />
                      </p>
                    ) : (
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted mt-0.5 truncate">
                        @{p.otherSystem.name}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Friends section */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              <Trans k="dashboard.yourFriends" />
            </h2>
          </div>
          {friendsWithInfo.length > 0 && (
            <Link href="/friends"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
            >
              <Trans k="common.seeAll" />
              <IconArrowRight />
            </Link>
          )}
        </div>

        {friendsWithInfo.length === 0 ? (
          <EmptyCallout
            messageKey="dashboard.friendsEmpty"
            ctaKey="dashboard.findFriends"
            href="/friends"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {friendsWithInfo.map((f) => (
              <Link key={f.friendshipId} href="/friends"
                className="group flex items-center gap-2.5 px-3 py-2 transition-all duration-150 hover:-translate-y-px"
                style={{
                  background: 'rgb(var(--theme-surface-rgb))',
                  borderLeft: '2px solid rgb(var(--theme-border-strong-rgb))',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                }}
              >
                <SystemAvatar system={f.otherSystem} size={28} />
                <span className="text-[12px] font-bold text-text truncate max-w-[120px] group-hover:text-primary transition-colors">
                  {f.otherSystem.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <RecentNotesSection recentNotes={recentNotes} />
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function EmptyCallout({
  messageKey,
  ctaKey,
  href,
}: {
  messageKey: TranslationKey;
  ctaKey: TranslationKey;
  href: string;
}) {
  return (
    <div className="relative overflow-hidden py-6 px-5"
      style={{
        background: 'rgb(var(--theme-surface-rgb))',
        borderLeft: '3px solid rgb(var(--theme-border-strong-rgb))',
      }}
    >
      <span className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-border-strong/50" aria-hidden="true" />
      <p className="text-sm text-muted mb-4">
        <Trans k={messageKey} />
      </p>
      <Link href={href}
        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-150 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        style={{
          background: 'rgb(var(--theme-primary-rgb))',
          color: 'rgb(var(--theme-bg-rgb))',
          clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
        }}
      >
        <IconPlus />
        <Trans k={ctaKey} />
      </Link>
    </div>
  );
}

function RecentNotesSection({
  recentNotes,
}: {
  recentNotes: { id: string; title: string | null; content: string; updatedAt: Date }[];
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            <Trans k="dashboard.recentNotes" />
          </h2>
        </div>
        <Link href="/notes"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
        >
          <Trans k="common.seeAll" />
          <IconArrowRight />
        </Link>
      </div>

      {recentNotes.length === 0 ? (
        <div className="relative overflow-hidden py-6 px-5"
          style={{
            background: 'rgb(var(--theme-surface-rgb))',
            borderLeft: '3px solid rgb(var(--theme-border-strong-rgb))',
          }}
        >
          <span className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-border-strong/50" aria-hidden="true" />
          <p className="text-sm text-muted mb-4">
            <Trans k="dashboard.notesEmpty" />
          </p>
          <Link href="/notes/new"
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
            <Link key={note.id} href={`/notes/${note.id}`}
              className="block relative overflow-hidden transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_0_1px_rgb(var(--theme-primary-rgb)/0.3),0_8px_24px_rgba(0,0,0,0.7)]"
              style={{
                background: 'rgb(var(--theme-surface-alt-rgb))',
                borderLeft: '3px solid rgb(var(--theme-primary-rgb))',
                padding: '0.75rem 1rem',
              }}
            >
              <span className="pointer-events-none absolute top-0 right-0 block w-2.5 h-2.5 border-t border-r border-primary/30" aria-hidden="true" />
              <p className="text-sm font-black text-text line-clamp-1">
                {note.title ?? <Trans k="dashboard.untitledNote" />}
              </p>
              <p className="text-xs text-muted mt-1 line-clamp-2">{note.content}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
