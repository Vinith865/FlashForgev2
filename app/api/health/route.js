import { canClientUpload, onVercel, storageMode, usingBlob } from '@/lib/store';
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
      blob: {
        connected: usingBlob(),
        clientUploads: canClientUpload(),
        auth: process.env.BLOB_READ_WRITE_TOKEN
          ? 'read-write-token'
          : process.env.BLOB_STORE_ID
          ? 'oidc'
          : 'none',
      },
      platform: onVercel() ? 'vercel' : 'local',
      adminConfigured: isAdminConfigured(),
      twoFactorEnabled: isTotpEnabled(),
      timestamp: new Date().toISOString(),
    },
  });
}
