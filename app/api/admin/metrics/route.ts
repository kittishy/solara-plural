import { ok } from '@/lib/api/helpers';
import { requireAdminApi } from '@/lib/auth/admin';
import { getAdminMetrics } from '@/lib/admin/metrics';

// GET /api/admin/metrics — aggregate stats for the admin dashboard.
export async function GET() {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const metrics = await getAdminMetrics();
  return ok(metrics);
}
