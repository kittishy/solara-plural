import { db } from '@/lib/db';
import { customFields, frontEntries, memberFieldValues, members } from '@/lib/db/schema';
import { eq, and, asc, desc, like, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { requireSystemId } from '@/lib/auth/session';
import { parseCustomFieldType, parseStoredCustomFieldOptions } from '@/lib/custom-fields';

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

  const [member, frontHistory, isFrontingEntry, profileFields, customValueRows] = await Promise.all([
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
      limit: 20,
    }),
    db.query.frontEntries.findFirst({
      columns: { id: true },
      where: and(
        eq(frontEntries.systemId, systemId),
        isNull(frontEntries.endedAt),
        like(frontEntries.memberIds, `%"${id}"%`)
      ),
    }),
    db.query.customFields.findMany({
      where: eq(customFields.systemId, systemId),
      orderBy: [asc(customFields.sortOrder), asc(customFields.createdAt)],
    }),
    db.query.memberFieldValues.findMany({
      columns: {
        fieldId: true,
        value: true,
      },
      where: and(
        eq(memberFieldValues.systemId, systemId),
        eq(memberFieldValues.memberId, id),
      ),
    }),
  ]);

  if (!member) notFound();

  const tags = member.tags ? JSON.parse(member.tags) as string[] : [];
  const accentColor = member.color ?? '#a78bfa';
  const isFronting = Boolean(isFrontingEntry);
  const valuesByFieldId = new Map(customValueRows.map((row) => [row.fieldId, row.value]));

  const completedSessions = frontHistory.filter((e) => e.endedAt);
  const frontTotalMs = completedSessions.reduce((sum, e) => {
    const ms = new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime();
    return sum + Math.max(0, ms);
  }, 0);
  const frontTotalMins = Math.floor(frontTotalMs / 60000);
  const frontTotalLabel = frontTotalMins < 60
    ? `${frontTotalMins}m`
    : frontTotalMins % 60 === 0
      ? `${Math.floor(frontTotalMins / 60)}h`
      : `${Math.floor(frontTotalMins / 60)}h ${frontTotalMins % 60}m`;

  const customDetails = profileFields
    .map((field) => {
      const value = valuesByFieldId.get(field.id);
      if (!value) return null;
      return {
        id: field.id,
        name: field.name,
        type: parseCustomFieldType(field.type) ?? 'text',
        options: parseStoredCustomFieldOptions(field.options),
        value,
      };
    })
    .filter((field): field is NonNullable<typeof field> => Boolean(field));

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
      <div className="rounded-xl overflow-hidden border border-border/40">
        {/* Banner */}
        <div
          className="relative flex flex-col items-center pt-8 pb-6 px-5"
          style={{
            background: `linear-gradient(160deg, ${accentColor} 0%, color-mix(in srgb, ${accentColor} 20%, #09070f) 100%)`,
          }}
        >
          {/* Edit button overlay */}
          <Link
            href={`/members/${member.id}/edit`}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 min-h-[36px] rounded-lg
              border border-white/20 bg-black/30 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white/90
              transition-colors hover:bg-black/50 hover:border-white/40"
            aria-label={`Edit ${member.name}`}
          >
            <IconEdit />
            Edit
          </Link>

          {/* Polaroid avatar */}
          <div
            className="rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex-shrink-0 overflow-hidden"
            style={{
              padding: '6px 6px 18px 6px',
              backgroundColor: 'rgba(255,255,255,0.96)',
              width: 132,
              height: 156,
            }}
            aria-hidden="true"
          >
            <div
              className="w-full rounded-lg overflow-hidden flex items-center justify-center text-4xl font-bold"
              style={{
                height: 120,
                backgroundColor: !member.avatarUrl ? accentColor : undefined,
                color: '#09070f',
              }}
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
          </div>

          {/* Fronting badge */}
          {isFronting && (
            <div className="mt-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
              <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-front opacity-60 animate-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-front" />
              </span>
              <span className="text-xs font-semibold text-front">Currently fronting</span>
            </div>
          )}
        </div>

        {/* Name / pronouns / role / tags — below the banner on surface */}
        <div className="bg-surface px-5 py-4 space-y-2">
          <div>
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

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
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

      {customDetails.length > 0 && (
        <section className="rounded-xl border border-border/40 bg-surface px-5 py-4" aria-labelledby="member-details-heading">
          <h2 id="member-details-heading" className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Details
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {customDetails.map((field) => (
              <div key={field.id} className="rounded-lg border border-border-soft bg-surface-alt/40 px-3 py-2">
                <dt className="text-xs font-medium text-muted">{field.name}</dt>
                <dd className="mt-1 text-sm text-text whitespace-pre-wrap">
                  {formatCustomFieldValue(field)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Front history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text">Front history</h2>
          {frontHistory.length === 20 && (
            <span className="text-subtle text-xs">Last 20 sessions</span>
          )}
        </div>

        {/* Front stats row */}
        {completedSessions.length > 0 && (
          <div
            className="flex items-center gap-1.5 text-xs font-medium mb-3 px-3 py-2 rounded-lg bg-surface-alt/50 border border-border/30 w-fit"
            style={{ color: accentColor }}
          >
            <span>{completedSessions.length} {completedSessions.length === 1 ? 'session' : 'sessions'}</span>
            <span className="text-border">·</span>
            <span>{frontTotalLabel} total</span>
          </div>
        )}

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

function formatCustomFieldValue(field: {
  type: ReturnType<typeof parseCustomFieldType> | 'text';
  options: Array<{ label: string; value: string }>;
  value: string;
}): string {
  if (field.type === 'checkbox') return field.value === 'true' ? 'Yes' : 'No';
  if (field.type === 'select') {
    return field.options.find((option) => option.value === field.value)?.label ?? field.value;
  }
  if (field.type === 'date') {
    const [year, month, day] = field.value.split('-').map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return field.value;
}
