import { describe, expect, it } from 'vitest';
import { createFrontSnapshotSignature } from '../front';

const base = {
  id: 'front-a',
  memberIds: ['member-a', 'member-b'],
  memberTiers: { 'member-a': 'primary', 'member-b': 'cofront' } as const,
  note: 'handoff',
  startedAt: '2026-07-28T12:00:00.000Z',
};

describe('createFrontSnapshotSignature', () => {
  it('is stable when tier object insertion order differs', () => {
    const signature = createFrontSnapshotSignature(base);
    expect(signature).toBe(
      createFrontSnapshotSignature({
        ...base,
        memberTiers: { 'member-b': 'cofront', 'member-a': 'primary' },
      })
    );
    expect(signature).toMatch(/^v1-[a-f0-9]{32}$/);
    expect(signature).toHaveLength(35);
  });

  it('changes when a role or note changes in place', () => {
    const signature = createFrontSnapshotSignature(base);
    expect(
      createFrontSnapshotSignature({
        ...base,
        memberTiers: { ...base.memberTiers, 'member-b': 'background' },
      })
    ).not.toBe(signature);
    expect(
      createFrontSnapshotSignature({ ...base, note: 'new handoff' })
    ).not.toBe(signature);
  });

  it('changes when membership or the active entry changes', () => {
    const signature = createFrontSnapshotSignature(base);
    expect(
      createFrontSnapshotSignature({ ...base, memberIds: ['member-a'] })
    ).not.toBe(signature);
    expect(
      createFrontSnapshotSignature({ ...base, id: 'front-b' })
    ).not.toBe(signature);
  });
});
