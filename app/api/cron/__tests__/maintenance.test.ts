import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteFn: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    delete: mocks.deleteFn,
    insert: mocks.insert,
    select: mocks.select,
  },
}));

vi.mock('@paralleldrive/cuid2', () => ({
  createId: () => 'audit_1',
}));

import { GET } from '../maintenance/route';

function request(auth?: string): Request {
  return new Request('http://localhost/api/cron/maintenance', {
    headers: auth ? { authorization: auth } : {},
  });
}

/** A delete chain that resolves `.returning()` to `rows`. */
function deleteChain(rows: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function selectChain(row: Record<string, unknown>) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([row]),
    }),
  };
}

describe('/api/cron/maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'test-secret');
    mocks.deleteFn.mockImplementation(() => deleteChain([]));
    mocks.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    mocks.select.mockImplementation(() => selectChain({ count: 0, bytes: 0 }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 503 when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = await GET(request('Bearer anything'));
    expect(res.status).toBe(503);
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });

  it('returns 401 on a wrong bearer token', async () => {
    const res = await GET(request('Bearer wrong'));
    expect(res.status).toBe(401);
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });

  it('returns 401 with no authorization header', async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it('runs all retention steps and reports a summary on a valid bearer', async () => {
    const res = await GET(request('Bearer test-secret'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    for (const key of [
      'accountPurge',
      'notifications',
      'notificationDeliveries',
      'rateLimits',
      'passwordResetTokens',
      'adminAuditLog',
      'revokedPushTokens',
    ]) {
      expect(json.data.summary[key]).toEqual({ deleted: 0, ms: expect.any(Number) });
    }
    expect(json.data.avatars).toBeDefined();
  });

  it('records an audit entry when accounts are purged', async () => {
    let call = 0;
    mocks.deleteFn.mockImplementation(() => {
      call += 1;
      // First delete is the account purge — pretend two accounts expired.
      return deleteChain(call === 1 ? [{ id: 'sys_a' }, { id: 'sys_b' }] : []);
    });
    const res = await GET(request('Bearer test-secret'));
    const json = await res.json();
    expect(json.data.summary.accountPurge).toEqual({ deleted: 2, ms: expect.any(Number) });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it('isolates step failures — one failing table does not stop the rest', async () => {
    let call = 0;
    mocks.deleteFn.mockImplementation(() => {
      call += 1;
      if (call === 2) {
        // notifications step blows up
        return {
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('boom')),
          }),
        };
      }
      return deleteChain([]);
    });
    const res = await GET(request('Bearer test-secret'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.summary.notifications).toEqual({ error: 'boom', ms: expect.any(Number) });
    expect(json.data.summary.rateLimits).toEqual({ deleted: 0, ms: expect.any(Number) });
    expect(json.data.summary.revokedPushTokens).toEqual({ deleted: 0, ms: expect.any(Number) });
  });
});
