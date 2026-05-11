import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { customFields, memberFieldValues } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import {
  normalizeCustomFieldDescription,
  normalizeCustomFieldName,
  parseCustomFieldOptions,
  parseCustomFieldType,
  parseStoredCustomFieldOptions,
  serializeCustomFieldOptions,
} from '@/lib/custom-fields';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid request payload.', 400);
  }

  const current = await db.query.customFields.findFirst({
    where: and(eq(customFields.id, id), eq(customFields.systemId, auth.systemId)),
  });
  if (!current) return err('Custom field not found.', 404);

  const payload = body as Record<string, unknown>;
  const nextType = parseCustomFieldType(payload.type) ?? parseCustomFieldType(current.type) ?? 'text';
  const nextName = 'name' in payload ? normalizeCustomFieldName(payload.name) : current.name;
  if (!nextName) return err('Field name is required and must be 80 characters or less.', 400);

  const nextOptions = nextType === 'select'
    ? parseCustomFieldOptions('options' in payload ? payload.options : parseStoredCustomFieldOptions(current.options))
    : [];
  if (nextType === 'select' && nextOptions.length === 0) {
    return err('Select fields need at least one option.', 400);
  }

  const [updated] = await db.update(customFields)
    .set({
      name: nextName,
      description: 'description' in payload
        ? normalizeCustomFieldDescription(payload.description)
        : current.description,
      type: nextType,
      options: serializeCustomFieldOptions(nextOptions),
      updatedAt: new Date(),
    })
    .where(and(eq(customFields.id, id), eq(customFields.systemId, auth.systemId)))
    .returning();

  revalidatePath('/settings');
  revalidatePath('/members');

  return ok({
    field: {
      ...updated,
      options: nextOptions,
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await db.delete(customFields)
    .where(and(eq(customFields.id, id), eq(customFields.systemId, auth.systemId)))
    .returning({ id: customFields.id });

  if (!deleted.length) return err('Custom field not found.', 404);

  await db.delete(memberFieldValues)
    .where(and(eq(memberFieldValues.fieldId, id), eq(memberFieldValues.systemId, auth.systemId)));

  revalidatePath('/settings');
  revalidatePath('/members');

  return ok({ deleted: true });
}
