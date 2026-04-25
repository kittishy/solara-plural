import { db } from '@/lib/db';
import { systemNotes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireSystemId } from '@/lib/auth/session';
import NotesClient from './NotesClient';

export default async function NotesPage() {
  const systemId = await requireSystemId();

  const notes = await db.query.systemNotes.findMany({
    columns: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
    },
    where: eq(systemNotes.systemId, systemId),
    orderBy: (n, { desc }) => [desc(n.updatedAt)],
  });

  return <NotesClient initialNotes={notes} />;
}
