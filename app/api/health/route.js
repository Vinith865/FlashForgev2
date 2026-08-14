import { storageMode } from '@/lib/store';
import { isAdminConfigured } from '@/lib/auth';

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
      timestamp: new Date().toISOString(),
    },
  });
}
