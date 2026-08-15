import { createAdminToken, verifyAdminCredentials, isAdminConfigured } from '@/lib/auth';
import { isTotpEnabled, verifyCode } from '@/lib/totp';
import {
  audit, clearFailures, clientIp, consumeTotpStep, lockoutState,
  recordFailure, LOCKOUT_THRESHOLD,
} from '@/lib/security';
import { readSecurityDoc, StorageError } from '@/lib/store';
import { ok, fail } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const minutes = (ms) => Math.max(1, Math.ceil(ms / 60000));

async function handleLogin(request) {
  if (!isAdminConfigured()) {
    return fail(
      'No admin password configured. Set ADMIN_PASSWORD_HASH in your environment variables.',
      503
    );
  }

  const ip = clientIp(request);

  // ── Lockout gate ──────────────────────────────────────────────────
  const doc = await readSecurityDoc();
  const lock = lockoutState(doc, ip);
  if (lock.locked) {
    return fail(
      `Too many failed attempts. Try again in ${minutes(lock.remainingMs)} minute(s).`,
      429
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
  const totp = String(body.totp || '');

  // ── Password ──────────────────────────────────────────────────────
  if (!verifyAdminCredentials(username, password)) {
    const after = await recordFailure({ ip, username, reason: 'bad_password' });
    return fail(
      after.locked
        ? `Too many failed attempts. Locked for ${minutes(after.remainingMs)} minute(s).`
        : `Invalid admin username or password. ${after.remaining} attempt(s) left.`,
      401
    );
  }

  // ── Second factor ─────────────────────────────────────────────────
  if (isTotpEnabled()) {
    if (!totp) {
      // Password was right — ask for the code without burning an attempt.
      return Response.json(
        { success: false, error: 'Authenticator code required', data: { totpRequired: true } },
        { status: 401 }
      );
    }

    const result = verifyCode(process.env.ADMIN_TOTP_SECRET, totp);
    if (!result.valid) {
      const after = await recordFailure({ ip, username, reason: 'bad_totp' });
      return Response.json(
        {
          success: false,
          error: after.locked
            ? `Too many failed attempts. Locked for ${minutes(after.remainingMs)} minute(s).`
            : `That code isn't valid. ${after.remaining} attempt(s) left.`,
          data: { totpRequired: true },
        },
        { status: 401 }
      );
    }

    // Reject reuse of a code that already logged someone in.
    if (!(await consumeTotpStep(result.step))) {
      await recordFailure({ ip, username, reason: 'totp_replay' });
      return Response.json(
        {
          success: false,
          error: 'That code has already been used. Wait for the next one.',
          data: { totpRequired: true },
        },
        { status: 401 }
      );
    }
  }

  await clearFailures(ip);
  await audit({ action: 'auth.login', actor: username, ip, detail: isTotpEnabled() ? 'password + 2FA' : 'password only' });

  return ok({
    token: await createAdminToken(username),
    username,
    twoFactor: isTotpEnabled(),
  });
}

export async function POST(request) {
  try {
    return await handleLogin(request);
  } catch (error) {
    if (error instanceof StorageError) return fail(error.message, 503);
    console.error('admin login failed:', error);
    return fail('Sign-in failed because of a server error. Check the deployment logs.', 500);
  }
}

export async function GET() {
  return ok({
    adminConfigured: isAdminConfigured(),
    twoFactorEnabled: isTotpEnabled(),
    lockoutThreshold: LOCKOUT_THRESHOLD,
  });
}
