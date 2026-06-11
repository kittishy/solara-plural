import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { systems, members, frontEntries } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { parseMemberIds } from "@/lib/front";
import { GlassCard } from "@/components/glass/GlassCard";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import {
  LANGUAGE_COOKIE_KEY,
  isLanguage,
  DEFAULT_LANGUAGE,
  translations,
  interpolate,
} from "@/lib/i18n";

function getServerT(lang: string) {
  const safeLang = isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  const dict = (translations as Record<string, Record<string, unknown>>)[safeLang];
  const fallback = (translations as Record<string, Record<string, unknown>>)[DEFAULT_LANGUAGE];

  function getNestedValue(obj: Record<string, unknown> | undefined, key: string): string | undefined {
    const parts = key.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === "string" ? current : undefined;
  }

  return function t(key: string, values?: Record<string, string | number>): string {
    const raw = getNestedValue(dict, key) ?? getNestedValue(fallback, key) ?? key;
    return values ? interpolate(raw, values) : raw;
  };
}

// Look up a public system by slug. Returns null unless the profile exists AND
// the master public switch is on — privacy is enforced at the query.
async function getPublicSystem(slug: string) {
  return db.query.systems.findFirst({
    columns: {
      id: true,
      name: true,
      description: true,
      avatarMode: true,
      avatarEmoji: true,
      avatarUrl: true,
      publicShowBio: true,
      publicShowMembers: true,
      publicShowFront: true,
    },
    where: and(eq(systems.publicSlug, slug), eq(systems.isPublic, 1)),
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const system = await getPublicSystem(params.slug);
  if (!system) return { title: "Solara Plural", robots: { index: false } };
  return {
    title: `${system.name} · Solara Plural`,
    description:
      system.publicShowBio === 1 && system.description
        ? system.description
        : undefined,
    // Shareable by link, but never indexed by search engines — protective
    // default for a vulnerable user base. The link works; Google won't surface it.
    robots: { index: false, follow: false },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const system = await getPublicSystem(params.slug);
  if (!system) notFound();

  const cookieStore = cookies();
  const langCookie = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const lang = isLanguage(langCookie) ? langCookie : DEFAULT_LANGUAGE;
  const t = getServerT(lang);

  const showBio = system.publicShowBio === 1;
  const showMembers = system.publicShowMembers === 1;
  const showFront = system.publicShowFront === 1;

  // Only ever load the members the system explicitly flagged public.
  const publicMembers =
    showMembers || showFront
      ? await db.query.members.findMany({
          columns: {
            id: true,
            name: true,
            pronouns: true,
            role: true,
            avatarUrl: true,
            color: true,
          },
          where: and(
            eq(members.systemId, system.id),
            eq(members.isPublic, 1),
            eq(members.isArchived, 0)
          ),
          orderBy: (m, { asc }) => [asc(m.name)],
        })
      : [];

  // Current front, intersected with the public member set so non-public members
  // are never revealed even indirectly.
  let frontingMembers: typeof publicMembers = [];
  if (showFront && publicMembers.length > 0) {
    const current = await db.query.frontEntries.findFirst({
      where: and(
        eq(frontEntries.systemId, system.id),
        isNull(frontEntries.endedAt)
      ),
    });
    if (current) {
      const frontingIds = new Set(parseMemberIds(current.memberIds));
      frontingMembers = publicMembers.filter((m) => frontingIds.has(m.id));
    }
  }

  return (
    <div className="animate-fade-in max-w-md mx-auto">
      {/* Header */}
      <div className="pt-12 pb-6 px-4 flex flex-col items-center gap-3">
        {system.avatarMode === "url" && system.avatarUrl ? (
          <div className="w-28 h-28 rounded-full overflow-hidden shadow-ios-md">
            <DynamicAvatarImage
              src={system.avatarUrl}
              alt={system.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center text-5xl shadow-ios-md">
            {system.avatarEmoji || "☀️"}
          </div>
        )}
        <h1 className="text-title-1 text-foreground text-center">{system.name}</h1>
      </div>

      {/* Bio */}
      {showBio && system.description && (
        <div className="px-4 mb-5">
          <GlassCard padding="lg">
            <p className="text-body text-foreground whitespace-pre-wrap text-center">
              {system.description}
            </p>
          </GlassCard>
        </div>
      )}

      {/* Current front */}
      {showFront && frontingMembers.length > 0 && (
        <div className="px-4 mb-5">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("publicProfile.frontingNow")}
          </p>
          <GlassCard padding="none" className="overflow-hidden">
            {frontingMembers.map((m) => (
              <MemberRow key={m.id} member={m} fronting />
            ))}
          </GlassCard>
        </div>
      )}

      {/* Members */}
      {showMembers && publicMembers.length > 0 && (
        <div className="px-4 mb-5">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("publicProfile.members")}
          </p>
          <GlassCard padding="none" className="overflow-hidden">
            {publicMembers.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </GlassCard>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pt-6 pb-2 text-center">
        <Link
          href="/"
          className="text-caption-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("publicProfile.poweredBy")}
        </Link>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  fronting,
}: {
  member: {
    id: string;
    name: string;
    pronouns: string | null;
    role: string | null;
    avatarUrl: string | null;
    color: string | null;
  };
  fronting?: boolean;
}) {
  const color = member.color ?? "#8E8E93";
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
      <div
        className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}
      >
        {member.avatarUrl ? (
          <DynamicAvatarImage
            src={member.avatarUrl}
            alt={member.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-body font-semibold" style={{ color }}>
            {member.name[0].toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body font-semibold text-foreground truncate">
            {member.name}
          </p>
          {fronting && (
            <span className="w-2 h-2 rounded-full bg-ios-green flex-shrink-0" />
          )}
        </div>
        {(member.pronouns || member.role) && (
          <p className="text-caption-1 text-muted-foreground truncate">
            {[member.pronouns, member.role].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
