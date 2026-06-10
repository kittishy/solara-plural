type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitState = Map<string, RateLimitBucket>;

const STORE_KEY = Symbol.for('solara.rate-limit.store');

function getStore(): RateLimitState {
  const root = globalThis as typeof globalThis & { [STORE_KEY]?: RateLimitState };
  root[STORE_KEY] ??= new Map();
  return root[STORE_KEY];
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

export function consumeRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now = Date.now(),
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const store = getStore();

  // Prune expired entries to keep the store bounded.
  store.forEach((bucket, k) => {
    if (bucket.resetAt <= now) store.delete(k);
  });

  const existing = store.get(key);

  if (!existing) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

/**
 * Postgres-backed limiter shared across all serverless instances — the
 * in-memory one above only sees its own instance, which on Vercel means an
 * attacker gets `limit × instances` attempts. The counter row is upserted in a
 * single atomic statement (no read-then-write race). If the database is
 * unreachable the call FAILS OPEN to the in-memory limiter: a degraded limit
 * beats locking every user out of login/registration during a DB hiccup.
 */
export async function consumeDurableRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const { limit, windowMs } = options;

  try {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');

    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at <= now() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at <= now() THEN now() + make_interval(secs => ${windowMs / 1000})
          ELSE rate_limits.reset_at
        END
      RETURNING count, reset_at
    `);

    const row = (result as unknown as { count: number; reset_at: Date | string }[])[0];
    if (!row) return { allowed: true };

    // Opportunistic cleanup so the table stays small without a cron.
    if (Math.random() < 0.02) {
      void db.execute(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`)
        .catch(() => undefined);
    }

    if (Number(row.count) > limit) {
      const resetAt = row.reset_at instanceof Date ? row.reset_at : new Date(row.reset_at);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
      };
    }
    return { allowed: true };
  } catch {
    return consumeRateLimit(key, options);
  }
}
