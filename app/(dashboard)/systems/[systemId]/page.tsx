import { and, eq, isNull, or } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { requireSystemId } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  frontEntries,
  members,
  systemBlocks,
  systemFriendMemberShares,
  systemFriendships,
  systems,
} from '@/lib/db/schema';
import {
  canonicalFriendPair,
  parseStoredFieldVisibilityJson,
  type FriendMemberFieldVisibility,
  type FriendMemberVisibility,
} from '@/lib/friends';

type Params = { params: Promise<{ systemId: string }> };

export default async function SharedSystemProfilePage({ params }: Params) {
  const viewerSystemId = await requireSystemId();
  const { systemId } = await params;
  if (!systemId || systemId === viewerSystemId) notFound();

  const pair = canonicalFriendPair(viewerSystemId, systemId);
  const [profile, friendship, block, activeFront, memberRows, shareRows] = await Promise.all([
    db.query.systems.findFirst({
      columns: {
        id: true,
        name: true,
        accountType: true,
        avatarMode: true,
        avatarEmoji: true,
        avatarUrl: true,
        description: true,
      },
      where: eq(systems.id, systemId),
    }),
    db.query.systemFriendships.findFirst({
      where: and(
        eq(systemFriendships.systemAId, pair.systemAId),
        eq(systemFriendships.systemBId, pair.systemBId),
      ),
    }),
    db.query.systemBlocks.findFirst({
      where: or(
        and(eq(systemBlocks.blockerSystemId, viewerSystemId), eq(systemBlocks.blockedSystemId, systemId)),
        and(eq(systemBlocks.blockerSystemId, systemId), eq(systemBlocks.blockedSystemId, viewerSystemId)),
      ),
    }),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
    }),
    db.query.members.findMany({
      columns: {
        id: true,
        name: true,
        pronouns: true,
        avatarUrl: true,
        description: true,
        color: true,
        role: true,
        tags: true,
        isArchived: true,
      },
      where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
      orderBy: (m, { asc }) => [asc(m.name)],
    }),
    db.query.systemFriendMemberShares.findMany({
      where: and(
        eq(systemFriendMemberShares.ownerSystemId, systemId),
        eq(systemFriendMemberShares.friendSystemId, viewerSystemId),
      ),
    }),
  ]);

  if (!profile || !friendship || block) notFound();

  const shareByMemberId = new Map(shareRows.map((share) => [share.memberId, share]));
  const visibleMembers = memberRows
    .map((member) => {
      const share = shareByMemberId.get(member.id);
      if (!share || share.visibility === 'hidden') return null;

      const visibility = share.visibility as FriendMemberVisibility;
      const fieldVisibility = parseStoredFieldVisibilityJson(share.fieldVisibility, visibility);
      return {
        id: member.id,
        name: member.name,
        pronouns: visibleField(member.pronouns, fieldVisibility, 'pronouns'),
        avatarUrl: visibleField(member.avatarUrl, fieldVisibility, 'avatarUrl'),
        description: visibleField(member.description, fieldVisibility, 'description'),
        color: visibleField(member.color, fieldVisibility, 'color'),
        role: visibleField(member.role, fieldVisibility, 'role'),
        tags: fieldVisibility.tags ? parseMemberTags(member.tags) : [],
      };
    })
    .filter((member): member is NonNullable<typeof member> => Boolean(member));

  const visibleMemberById = new Map(visibleMembers.map((member) => [member.id, member]));
  const frontMembers = activeFront
    ? parseMemberIds(activeFront.memberIds)
        .map((id) => visibleMemberById.get(id))
        .filter((member): member is NonNullable<typeof member> => Boolean(member))
    : [];

  return (
    <div className="animate-fade-in space-y-5">
      <Link href="/friends" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text">
        <span aria-hidden="true">←</span>
        Friends
      </Link>

      <section className="rounded-xl border border-border/40 bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-alt">
            {profile.avatarMode === 'url' && profile.avatarUrl ? (
              <DynamicAvatarImage src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl leading-none">{profile.avatarEmoji || '☀️'}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {profile.accountType === 'singlet' ? 'Singlet friend' : 'Connected system'}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-text">{profile.name}</h1>
            {profile.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{profile.description}</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-front/30 bg-front-soft/15 p-5 shadow-front-glow" aria-labelledby="shared-front-heading">
        <h2 id="shared-front-heading" className="text-base font-semibold text-text">Current front</h2>
        {frontMembers.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {frontMembers.map((member) => (
              <SharedMemberChip key={member.id} member={member} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No shared front is visible right now.
          </p>
        )}
      </section>

      <section aria-labelledby="shared-members-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="shared-members-heading" className="text-base font-semibold text-text">Shared members</h2>
            <p className="mt-1 text-sm text-muted">Only members this system chose to share with you appear here.</p>
          </div>
          <span className="text-xs text-subtle">{visibleMembers.length} visible</span>
        </div>

        {visibleMembers.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2" role="list">
            {visibleMembers.map((member) => (
              <li key={member.id} className="rounded-xl border border-border/40 bg-surface px-4 py-3">
                <div className="flex gap-3">
                  <SharedMemberAvatar member={member} />
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{member.name}</p>
                    {member.pronouns && <p className="text-sm text-muted">{member.pronouns}</p>}
                    {member.role && <p className="mt-1 text-xs text-primary-glow">{member.role}</p>}
                    {member.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{member.description}</p>
                    )}
                    {member.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {member.tags.map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border/40 bg-surface px-4 py-6 text-center text-sm text-muted">
            They have not shared member profiles with you yet.
          </p>
        )}
      </section>
    </div>
  );
}

type SharedMember = {
  id: string;
  name: string;
  pronouns: string | null;
  avatarUrl: string | null;
  description: string | null;
  color: string | null;
  role: string | null;
  tags: string[];
};

function SharedMemberChip({ member }: { member: SharedMember }) {
  return (
    <div className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-front/30 bg-surface px-3 py-1.5 text-sm text-text">
      <SharedMemberAvatar member={member} compact />
      <span className="font-medium">{member.name}</span>
    </div>
  );
}

function SharedMemberAvatar({ member, compact = false }: { member: SharedMember; compact?: boolean }) {
  const size = compact ? 'h-7 w-7 text-xs' : 'h-11 w-11 text-base';
  return (
    <span
      className={`${size} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-bg`}
      style={!member.avatarUrl ? { backgroundColor: member.color ?? '#a78bfa' } : undefined}
      aria-hidden="true"
    >
      {member.avatarUrl ? (
        <DynamicAvatarImage src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        member.name[0]?.toUpperCase() ?? '?'
      )}
    </span>
  );
}

function parseMemberIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parseMemberTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function visibleField<T>(
  value: T,
  fieldVisibility: FriendMemberFieldVisibility,
  key: keyof FriendMemberFieldVisibility,
): T | null {
  return fieldVisibility[key] ? value : null;
}
