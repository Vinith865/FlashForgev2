import { createAdminToken, verifyAdminCredentials, isAdminConfigured } from '@/lib/auth';
import { ok, fail } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!isAdminConfigured()) {
    return fail(
      'No admin password configured. Set ADMIN_PASSWORD_HASH in your environment variables.',
      503
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const username = String(body.username || '');
  const password = String(body.password || '');

  if (!verifyAdminCredentials(username, password)) {
    return fail('Invalid admin username or password', 401);
  }

  return ok({ token: createAdminToken(username), username });
}
