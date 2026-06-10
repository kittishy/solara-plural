import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import { err, ok, parseJsonRecord } from '@/lib/api/helpers';
import { consumeDurableRateLimit, getClientIp } from '@/lib/rate-limit';

// Pragmatic email shape check — not a full RFC validator, just enough to keep
// obvious garbage out of the accounts table.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // Public sign-up surface: throttle per IP to blunt automated account spam.
  const rate = await consumeDurableRateLimit(
    `register:ip:${getClientIp(request)}`,
    { limit: 5, windowMs: 60 * 60 * 1000 },
  );
  if (!rate.allowed) {
    return err('Too many sign-up attempts. Please try again later.', 429);
  }

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const description = typeof body.description === 'string' ? body.description.trim() || null : null;

  const normalizedAccountType = body.accountType === 'singlet' ? 'singlet' : 'system';

  if (!name || !email || !password) {
    return err('Name, email, and password are required', 400);
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return err('Please enter a valid email address', 400);
  }
  if (password.length < 8) {
    return err('Password must be at least 8 characters', 400);
  }

  const existing = await db.query.systems.findFirst({ where: eq(systems.email, email) });
  if (existing) {
    return err('An account with that email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await db.insert(systems).values({
    id: createId(), name, email,
    passwordHash,
    description,
    accountType: normalizedAccountType,
    createdAt: now,
    updatedAt: now,
  });

  return ok({ registered: true }, 201);
}
