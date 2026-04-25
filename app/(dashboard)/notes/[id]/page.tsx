import { db } from '@/lib/db';
import { systemNotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import NoteEditor from './NoteEditor';
import { requireSystemId } from '@/lib/auth/session';

export default async function NotePage({ params }: { params: { id: string } }) {
  // Handle "new" as a special case
  if (params.id === 'new') {
    return <NoteEditor note={null} />;
  }

  const systemId = await requireSystemId();

  const note = await db.query.systemNotes.findFirst({
    columns: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
    },
    where: and(eq(systemNotes.id, params.id), eq(systemNotes.systemId, systemId)),
  });

  if (!note) notFound();
  return <NoteEditor note={note} />;
}
