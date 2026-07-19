import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findNotes: vi.fn(),
  findMembers: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  requireAuth: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      systemNotes: {
        findMany: mocks.findNotes,
      },
      members: {
        findMany: mocks.findMembers,
      },
    },
    insert: mocks.insert,
  },
}));

vi.mock('@/lib/api/helpers', () => ({
  requireAuth: mocks.requireAuth,
  ok: <T>(data: T, status = 200, init?: { headers?: Record<string, string> }) =>
    Response.json({ success: true, data }, { status, headers: init?.headers }),
  err: (message: string, status = 400) =>
    Response.json({ success: false, error: message }, { status }),
  parseJsonRecord: async (request: Request) => {
    try {
      const data = await request.json();
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return { error: Response.json({ success: false, error: 'JSON payload must be an object' }, { status: 400 }) };
      }
      return { data };
    } catch {
      return { error: Response.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 }) };
    }
  },
}));

vi.mock('@paralleldrive/cuid2', () => ({
  createId: () => 'note_1',
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { GET, POST } from '../route';

describe('/api/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ systemId: 'system_a' });
    mocks.findNotes.mockResolvedValue([]);
    mocks.findMembers.mockResolvedValue([]);
    mocks.insert.mockReturnValue({ values: mocks.insertValues });
    mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
    mocks.insertReturning.mockResolvedValue([{ id: 'note_1' }]);
  });

  it('returns privacy and member linkage fields needed by the notes UI', async () => {
    await GET(new Request('https://solara.local/api/notes'));

    expect(mocks.findNotes).toHaveBeenCalledTimes(1);
    expect(mocks.findNotes.mock.calls[0][0].columns).toMatchObject({
      id: true,
      isPrivate: true,
      memberId: true,
    });
  });

  it('caps and clamps the list limit', async () => {
    await GET(new Request('https://solara.local/api/notes?limit=99999&offset=-5'));

    const args = mocks.findNotes.mock.calls[0][0];
    expect(args.limit).toBe(500);
    expect(args.offset).toBe(0);
  });

  it('rejects a linked member id that does not belong to the authenticated system', async () => {
    const response = await POST(new Request('https://solara.local/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Private context', memberId: 'member_from_other_system' }),
    }));

    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json).toMatchObject({ success: false });
    expect(json.error).toMatch(/member/i);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
