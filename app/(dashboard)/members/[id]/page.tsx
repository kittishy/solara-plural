import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Pencil, Clock, Hand } from "lucide-react";
import { db } from "@/lib/db";
import {
  members,
  frontEntries,
  customFields,
} from "@/lib/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";
import { requireSystemId } from "@/lib/auth/session";
import { parseMemberIds } from "@/lib/front";
import { parseStoredTags } from "@/lib/members/fields";
import { parseStoredCustomFieldOptions } from "@/lib/custom-fields";
import { readMemberCustomFieldValues } from "@/lib/member-custom-fields";
import { GlassCard, GroupedSection } from "@/components/glass/GlassCard";
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

function formatDate(value: Date | number | null, lang: string) {
  if (!value) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : value;
  return d.toLocaleDateString(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date | number | null, lang: string) {
  if (!value) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : value;
  return d.toLocaleString(lang, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: Date | number | null, end: Date | number | null): string | null {
  if (!start || !end) return null;
  const startMs = start instanceof Date ? start.getTime() : start * 1000;
  const endMs = end instanceof Date ? end.getTime() : end * 1000;
  const totalMin = Math.floor((endMs - startMs) / 60_000);
  if (totalMin < 1) return "< 1m";
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hr > 0 && min > 0) return `${hr}h ${min}m`;
  if (hr > 0) return `${hr}h`;
  return `${min}m`;
}

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const systemId = await requireSystemId();

  const cookieStore = cookies();
  const langCookie = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const lang = isLanguage(langCookie) ? langCookie : DEFAULT_LANGUAGE;
  const t = getServerT(lang);

  const member = await db.query.members.findFirst({
    where: and(eq(members.id, params.id), eq(members.systemId, systemId)),
  });

  if (!member) notFound();

  const [history, definitions, values, currentFront] = await Promise.all([
    db.query.frontEntries.findMany({
      where: eq(frontEntries.systemId, systemId),
      orderBy: [desc(frontEntries.startedAt)],
      limit: 50,
    }),
    db.query.customFields.findMany({
      where: eq(customFields.systemId, systemId),
      orderBy: (f, { asc }) => [asc(f.sortOrder)],
    }),
    readMemberCustomFieldValues(systemId, member.id),
    db.query.frontEntries.findFirst({
      where: and(
        eq(frontEntries.systemId, systemId),
        isNull(frontEntries.endedAt)
      ),
    }),
  ]);

  const memberHistory = history
    .filter((entry) => parseMemberIds(entry.memberIds).includes(member.id))
    .slice(0, 20);

  const isFronting =
    currentFront != null &&
    parseMemberIds(currentFront.memberIds).includes(member.id);

  const tags = parseStoredTags(member.tags);
  const memberColor = member.color ?? "#8E8E93";

  return (
    <div className="animate-fade-in pb-8">
      {/* Nav */}
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
        <div className="flex items-center justify-between px-4 h-11">
          <Link
            href="/members"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("members.title")}</span>
          </Link>
          <Link
            href={`/members/${member.id}/edit`}
            className="flex items-center gap-1 text-ios-blue ios-press"
          >
            <Pencil size={16} />
            <span className="text-body font-semibold">{t("members.edit")}</span>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div
        className="pt-8 pb-5 px-4 flex flex-col items-center gap-3"
        style={{
          background: `linear-gradient(to bottom, ${memberColor}11, transparent)`,
        }}
      >
        <div
          className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center shadow-ios-md"
          style={{
            background: `${memberColor}22`,
            border: `3px solid ${memberColor}66`,
            // Shared-element target: matches the list avatar tagged by
            // lib/view-transition.ts (HERO_AVATAR), so it morphs in on nav.
            ["viewTransitionName" as string]: "solara-hero",
          }}
        >
          {member.avatarUrl ? (
            <DynamicAvatarImage
              src={member.avatarUrl}
              alt={member.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="text-5xl font-bold"
              style={{ color: memberColor }}
            >
              {member.name[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-title-1 text-foreground">{member.name}</h1>
          {member.pronouns && (
            <p className="text-subheadline text-muted-foreground mt-0.5">
              {member.pronouns}
            </p>
          )}
          {isFronting && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-ios-green/15">
              <span className="w-2 h-2 rounded-full bg-ios-green" />
              <span className="text-caption-1 font-semibold text-ios-green">
                {t("members.frontingNow")}
              </span>
            </div>
          )}
        </div>

        {member.role && (
          <p className="text-callout text-muted-foreground italic">
            {member.role}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-caption-1 font-semibold"
                style={{
                  background: `${memberColor}22`,
                  color: memberColor,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Link
          href="/front"
          className="mt-2 flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 text-sm font-extrabold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Hand size={18} aria-hidden />
          {isFronting ? t("front.switchFront") : t("front.startFront")}
        </Link>
      </div>

      {/* Description */}
      {member.description && (
        <div className="px-4 mb-5">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("members.about")}
          </p>
          <GlassCard padding="lg">
            <p className="text-body text-foreground whitespace-pre-wrap">
              {member.description}
            </p>
          </GlassCard>
        </div>
      )}

      {/* Custom fields */}
      {definitions.length > 0 && (
        <div className="px-4 mb-5">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("members.details")}
          </p>
          <GroupedSection>
            {definitions.map((field) => {
              const rawValue = values[field.id];
              if (!rawValue) return null;
              let display = rawValue;
              if (field.type === "checkbox") {
                display = rawValue === "true" ? t("members.checkboxYes") : t("members.checkboxNo");
              } else if (field.type === "select") {
                const opts = parseStoredCustomFieldOptions(field.options);
                display =
                  opts.find((o) => o.value === rawValue)?.label ?? rawValue;
              } else if (field.type === "date") {
                display = formatDate(new Date(rawValue), lang);
              }
              return (
                <div
                  key={field.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <span className="text-body text-muted-foreground">
                    {field.name}
                  </span>
                  <span className="text-body text-foreground text-right max-w-[60%] truncate">
                    {display}
                  </span>
                </div>
              );
            })}
          </GroupedSection>
        </div>
      )}

      {/* Notes */}
      {member.notes && (
        <div className="px-4 mb-5">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("members.notes")}
          </p>
          <GlassCard padding="lg">
            <p className="text-body text-foreground whitespace-pre-wrap">
              {member.notes}
            </p>
          </GlassCard>
        </div>
      )}

      {/* Front history */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("members.frontHistory")}
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {memberHistory.length === 0 ? (
            <div className="p-5 text-center text-muted-foreground text-subheadline">
              {t("members.noFrontHistory")}
            </div>
          ) : (
            memberHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-subheadline text-foreground">
                    {formatDateTime(entry.startedAt, lang)}
                    {entry.endedAt && (
                      <span className="text-muted-foreground font-normal">
                        {" → "}{formatDateTime(entry.endedAt, lang)}
                      </span>
                    )}
                  </p>
                  {(() => {
                    const dur = formatDuration(entry.startedAt, entry.endedAt);
                    return dur ? (
                      <p className="text-caption-1 text-muted-foreground">{dur}</p>
                    ) : null;
                  })()}
                </div>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
}
