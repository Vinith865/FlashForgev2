import { storageMode } from '@/lib/store';
import { isAdminConfigured } from '@/lib/auth';
import { isTotpEnabled } from '@/lib/totp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    success: true,
    data: {
      status: 'ok',
      version: '2.0.0',
      storage: storageMode(),
      adminConfigured: isAdminConfigured(),
      twoFactorEnabled: isTotpEnabled(),
      timestamp: new Date().toISOString(),
    },
  });
}
