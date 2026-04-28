import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';

type AvatarMode = 'emoji' | 'url';

const DEFAULT_AVATAR_EMOJI = '☀️';

function parseAvatarMode(value: unknown): AvatarMode {
  return value === 'url' ? 'url' : 'emoji';
}

function parseAvatarEmoji(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_AVATAR_EMOJI;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 16) : DEFAULT_AVATAR_EMOJI;
}

function parseAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

function parseName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
}

function parseDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 600) : null;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const account = await db.query.systems.findFirst({
    columns: {
      id: true,
      name: true,
      email: true,
      description: true,
      accountType: true,
      avatarMode: true,
      avatarEmoji: true,
      avatarUrl: true,
    },
    where: eq(systems.id, auth.systemId),
  });

  if (!account) return err('Account not found.', 404);

  return ok(account);
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON payload.', 400);
  }

  const payload = body as Record<string, unknown>;
  const name = parseName(payload.name);
  if (!name) return err('Name is required.', 400);

  const avatarMode = parseAvatarMode(payload.avatarMode);
  const avatarEmoji = parseAvatarEmoji(payload.avatarEmoji);
  const avatarUrl = parseAvatarUrl(payload.avatarUrl);

  if (avatarMode === 'url' && !avatarUrl) {
    return err('Please provide a valid image URL (http/https) for URL avatar mode.', 400);
  }

  const description = parseDescription(payload.description);

  const updated = await db
    .update(systems)
    .set({
      name,
      description,
      avatarMode,
      avatarEmoji,
      avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(systems.id, auth.systemId))
    .returning({
      id: systems.id,
      name: systems.name,
      email: systems.email,
      description: systems.description,
      accountType: systems.accountType,
      avatarMode: systems.avatarMode,
      avatarEmoji: systems.avatarEmoji,
      avatarUrl: systems.avatarUrl,
      updatedAt: systems.updatedAt,
    });

  if (!updated.length) return err('Account not found.', 404);

  revalidatePath('/');
  revalidatePath('/settings');
  revalidatePath('/friends');

  return ok(updated[0]);
}
