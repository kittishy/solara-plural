import { db } from '@/lib/db';
import { systemJournal } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireSystemId } from '@/lib/auth/session';
import JournalClient from './JournalClient';

export default async function JournalPage() {
  const systemId = await requireSystemId();

  const entries = await db.query.systemJournal.findMany({
    columns: {
      id: true,
      title: true,
      content: true,
      mood: true,
      createdAt: true,
    },
    where: eq(systemJournal.systemId, systemId),
    orderBy: [desc(systemJournal.createdAt)],
    limit: 30,
  });

  const serialized = entries.map((e) => ({
    ...e,
    content: e.content.slice(0, 200),
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
  }));

  return <JournalClient initialEntries={serialized} />;
}
