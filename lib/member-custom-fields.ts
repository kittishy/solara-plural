import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customFields, memberFieldValues } from '@/lib/db/schema';
import {
  normalizeCustomFieldValue,
  parseCustomFieldType,
  parseStoredCustomFieldOptions,
} from '@/lib/custom-fields';

export async function readMemberCustomFieldValues(
  systemId: string,
  memberId: string,
): Promise<Record<string, string>> {
  const rows = await db.query.memberFieldValues.findMany({
    columns: {
      fieldId: true,
      value: true,
    },
    where: and(
      eq(memberFieldValues.systemId, systemId),
      eq(memberFieldValues.memberId, memberId),
    ),
  });

  return Object.fromEntries(
    rows
      .filter((row) => row.value)
      .map((row) => [row.fieldId, row.value as string]),
  );
}

export async function saveMemberCustomFieldValues(
  systemId: string,
  memberId: string,
  rawValues: unknown,
): Promise<Record<string, string>> {
  if (!isRecord(rawValues)) return {};

  const fields = await db.query.customFields.findMany({
    where: eq(customFields.systemId, systemId),
  });
  const output: Record<string, string> = {};
  const now = new Date();

  for (const field of fields) {
    if (!(field.id in rawValues)) continue;

    const type = parseCustomFieldType(field.type) ?? 'text';
    const normalized = normalizeCustomFieldValue(type, rawValues[field.id]);
    const options = parseStoredCustomFieldOptions(field.options);
    const allowedSelect = type !== 'select' || !normalized || options.some((option) => option.value === normalized);

    if (!normalized || !allowedSelect) {
      await db.delete(memberFieldValues).where(and(
        eq(memberFieldValues.systemId, systemId),
        eq(memberFieldValues.memberId, memberId),
        eq(memberFieldValues.fieldId, field.id),
      ));
      continue;
    }

    await db.insert(memberFieldValues).values({
      id: createId(),
      systemId,
      memberId,
      fieldId: field.id,
      value: normalized,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [memberFieldValues.memberId, memberFieldValues.fieldId],
      set: {
        value: normalized,
        updatedAt: now,
      },
    });
    output[field.id] = normalized;
  }

  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
