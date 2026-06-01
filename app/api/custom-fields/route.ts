import { createId } from '@paralleldrive/cuid2';
import { asc, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { customFields } from '@/lib/db/schema';
import { err, ok, requireAuth, parseJsonRecord } from '@/lib/api/helpers';
import { CACHE_FRESH_LONG } from '@/lib/api/cache-headers';
import {
  normalizeCustomFieldDescription,
  normalizeCustomFieldName,
  parseCustomFieldOptions,
  parseCustomFieldType,
  parseStoredCustomFieldOptions,
  serializeCustomFieldOptions,
} from '@/lib/custom-fields';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const fields = await db.query.customFields.findMany({
    where: eq(customFields.systemId, auth.systemId),
    orderBy: [asc(customFields.sortOrder), asc(customFields.createdAt)],
  });

  return ok({
    fields: fields.map((field) => ({
      ...field,
      options: parseStoredCustomFieldOptions(field.options),
    })),
  }, 200, { headers: { ...CACHE_FRESH_LONG } });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const name = normalizeCustomFieldName(payload.name);
  const type = parseCustomFieldType(payload.type) ?? 'text';

  if (!name) return err('Field name is required and must be 80 characters or less.', 400);

  const options = type === 'select' ? parseCustomFieldOptions(payload.options) : [];
  if (type === 'select' && options.length === 0) {
    return err('Select fields need at least one option.', 400);
  }

  const [sortRow] = await db
    .select({ nextSort: sql<number>`coalesce(max(${customFields.sortOrder}), -1) + 1` })
    .from(customFields)
    .where(eq(customFields.systemId, auth.systemId));

  const now = new Date();
  const [created] = await db.insert(customFields).values({
    id: createId(),
    systemId: auth.systemId,
    name,
    description: normalizeCustomFieldDescription(payload.description),
    type,
    options: serializeCustomFieldOptions(options),
    sortOrder: Number(sortRow?.nextSort ?? 0),
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath('/settings');
  revalidatePath('/members');

  return ok({
    field: {
      ...created,
      options,
    },
  }, 201);
}
