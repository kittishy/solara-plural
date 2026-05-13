import { describe, it, expect, beforeEach } from 'vitest';
import { consumeRateLimit, getClientIp } from '../rate-limit';

// Clear the global rate-limit store between tests
const STORE_KEY = Symbol.for('solara.rate-limit.store');
beforeEach(() => {
  const root = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, unknown> };
  if (root[STORE_KEY]) root[STORE_KEY].clear();
});

describe('consumeRateLimit', () => {
  it('allows requests within the limit', () => {
    const result = consumeRateLimit('test:key', { limit: 3, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
  });

  it('blocks requests that exceed the limit', () => {
    const opts = { limit: 2, windowMs: 60_000 };
    const now = Date.now();
    consumeRateLimit('block:key', opts, now);
    consumeRateLimit('block:key', opts, now);
    const result = consumeRateLimit('block:key', opts, now);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it('resets the window after the window expires', () => {
    const opts = { limit: 1, windowMs: 1_000 };
    const t0 = Date.now();
    consumeRateLimit('expire:key', opts, t0);
    consumeRateLimit('expire:key', opts, t0);

    // Simulate window expiry
    const t1 = t0 + 2_000;
    const result = consumeRateLimit('expire:key', opts, t1);
    expect(result.allowed).toBe(true);
  });

  it('counts separate keys independently', () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const now = Date.now();
    consumeRateLimit('key:a', opts, now);
    consumeRateLimit('key:a', opts, now);

    const resultB = consumeRateLimit('key:b', opts, now);
    expect(resultB.allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  function fakeRequest(headers: Record<string, string>): Request {
    return new Request('https://example.com', { headers });
  }

  it('prefers X-Forwarded-For', () => {
    const req = fakeRequest({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2' });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('falls back to X-Real-IP', () => {
    const req = fakeRequest({ 'x-real-ip': '10.0.0.3' });
    expect(getClientIp(req)).toBe('10.0.0.3');
  });

  it('falls back to CF-Connecting-IP', () => {
    const req = fakeRequest({ 'cf-connecting-ip': '10.0.0.4' });
    expect(getClientIp(req)).toBe('10.0.0.4');
  });

  it('returns "unknown" when no IP header is present', () => {
    const req = fakeRequest({});
    expect(getClientIp(req)).toBe('unknown');
  });
});
