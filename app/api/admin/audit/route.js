import { requireAdmin } from '@/lib/auth';
import { readAudit } from '@/lib/security';
import { ok } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  return ok(await readAudit());
}
