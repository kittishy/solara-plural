import { db } from '@/lib/db';
import { members, frontEntries, systemNotes, systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/api/helpers';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const [system] = await db.select().from(systems).where(eq(systems.id, auth.systemId));
  if (!system) {
    return NextResponse.json({ success: false, error: 'System profile not found.' }, { status: 404 });
  }

  const allMembers = await db.select().from(members).where(eq(members.systemId, auth.systemId));
  const allFront = await db.select().from(frontEntries).where(eq(frontEntries.systemId, auth.systemId));
  const allNotes = await db.select().from(systemNotes).where(eq(systemNotes.systemId, auth.systemId));

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    system: { id: system.id, name: system.name, description: system.description },
    members: allMembers.map((m) => ({ ...m, tags: m.tags ? JSON.parse(m.tags) : [] })),
    frontHistory: allFront.map((f) => ({ ...f, memberIds: JSON.parse(f.memberIds) })),
    notes: allNotes,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="solara-export-${Date.now()}.json"`,
    },
  });
}
