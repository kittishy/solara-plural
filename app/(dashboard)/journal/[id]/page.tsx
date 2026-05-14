import { db } from '@/lib/db';
import { systemJournal, members } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { requireSystemId } from '@/lib/auth/session';
import JournalEditor from './JournalEditor';

type MemberPickerItem = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
};

export default async function JournalEntryPage({ params }: { params: { id: string } }) {
  const systemId = await requireSystemId();

  const activeMembers = await db.query.members.findMany({
    columns: { id: true, name: true, color: true, avatarUrl: true },
    where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
    orderBy: (m, { asc }) => [asc(m.name)],
  }) satisfies MemberPickerItem[];

  if (params.id === 'new') {
    return <JournalEditor entry={null} members={activeMembers} />;
  }

  const entry = await db.query.systemJournal.findFirst({
    where: and(eq(systemJournal.id, params.id), eq(systemJournal.systemId, systemId)),
  });

  if (!entry) notFound();

  const serialized = {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    frontingMemberIds: (() => {
      try {
        const parsed: unknown = JSON.parse(entry.frontingMemberIds ?? '[]');
        return Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')
          ? (parsed as string[])
          : [];
      } catch {
        return [];
      }
    })(),
    isPrivate: entry.isPrivate === 1,
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : String(entry.updatedAt),
  };

  return <JournalEditor entry={serialized} members={activeMembers} />;
}
