import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Clock } from "lucide-react";
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

function formatDate(value: Date | number | null) {
  if (!value) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : value;
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date | number | null) {
  if (!value) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : value;
  return d.toLocaleString("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const systemId = await requireSystemId();

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

  // Filter front history to only entries that included this member
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
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-11">
          <Link
            href="/members"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">Membros</span>
          </Link>
          <Link
            href={`/members/${member.id}/edit`}
            className="flex items-center gap-1 text-ios-blue ios-press"
          >
            <Pencil size={16} />
            <span className="text-body font-semibold">Editar</span>
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
                Na frente agora
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
      </div>

      {/* Description */}
      {member.description && (
        <div className="px-4 mb-5">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Sobre
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
            Detalhes
          </p>
          <GroupedSection>
            {definitions.map((field) => {
              const rawValue = values[field.id];
              if (!rawValue) return null;
              let display = rawValue;
              if (field.type === "checkbox") {
                display = rawValue === "true" ? "Sim" : "Não";
              } else if (field.type === "select") {
                const opts = parseStoredCustomFieldOptions(field.options);
                display =
                  opts.find((o) => o.value === rawValue)?.label ?? rawValue;
              } else if (field.type === "date") {
                display = formatDate(new Date(rawValue));
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
            Notas
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
          Histórico na frente
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {memberHistory.length === 0 ? (
            <div className="p-5 text-center text-muted-foreground text-subheadline">
              Sem histórico ainda
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
                    {formatDateTime(entry.startedAt)}
                  </p>
                  {entry.endedAt && (
                    <p className="text-caption-1 text-muted-foreground">
                      até {formatDateTime(entry.endedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
}
