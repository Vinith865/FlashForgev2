import { requireAdmin } from '@/lib/auth';
import { isTotpEnabled } from '@/lib/totp';
import { audit, clientIp, revokeAllSessions } from '@/lib/security';
import { ok } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  return ok({
    username: claims.sub,
    issuedAt: claims.iat,
    expiresAt: claims.exp,
    epoch: claims.epoch,
    twoFactor: isTotpEnabled(),
  });
}

/** Revokes every issued token, including the caller's. */
export async function DELETE(request) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  const epoch = await revokeAllSessions(claims.sub);
  await audit({ action: 'sessions.revoked', actor: claims.sub, ip: clientIp(request) });
  return ok({ revoked: true, epoch });
}
