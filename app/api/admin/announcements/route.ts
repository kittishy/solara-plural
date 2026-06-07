import { db } from '@/lib/db';
import { adminAnnouncements, systems } from '@/lib/db/schema';
import { desc, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { requireAdminApi } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/admin/audit';
import { createNotification } from '@/lib/notifications/create-notification';

const LEVELS = new Set(['info', 'warning', 'critical']);

// GET /api/admin/announcements — list all announcements, newest first.
export async function GET() {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const rows = await db
    .select()
    .from(adminAnnouncements)
    .orderBy(desc(adminAnnouncements.createdAt))
    .limit(100);

  return ok({ data: rows });
}

// POST /api/admin/announcements — create an announcement, optionally pushing it
// to every active account as an in-app + push notification.
export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const message = typeof body.body === 'string' ? body.body.trim() : '';
  const level = typeof body.level === 'string' && LEVELS.has(body.level) ? body.level : 'info';
  const push = body.push === true;

  if (!title) return err('Title is required');
  if (!message) return err('Body is required');

  const now = new Date();
  const id = createId();

  const [created] = await db
    .insert(adminAnnouncements)
    .values({
      id,
      title,
      body: message,
      level,
      active: 1,
      authorSystemId: gate.admin.systemId,
      pushedAt: push ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  let recipientCount = 0;
  if (push) {
    // Fan out to every account that can still sign in. Sequential, fire-and-
    // forget per recipient so one bad push token can't fail the whole batch.
    const recipients = await db
      .select({ id: systems.id })
      .from(systems)
      .where(isNull(systems.suspendedAt));
    recipientCount = recipients.length;

    void (async () => {
      for (const r of recipients) {
        try {
          await createNotification({
            recipientSystemId: r.id,
            type: 'admin_announcement',
            title,
            body: message,
            data: { announcementId: id, level },
            push: { title, body: message, url: '/' },
          });
        } catch (e) {
          console.error('[admin-announcement] delivery failed for', r.id, e);
        }
      }
    })();
  }

  await recordAudit({
    actorSystemId: gate.admin.systemId,
    actorEmail: gate.admin.email,
    action: 'announcement.create',
    targetType: 'announcement',
    targetId: id,
    metadata: { title, level, push, recipientCount },
  });

  return ok({ ...created, recipientCount }, 201);
}
