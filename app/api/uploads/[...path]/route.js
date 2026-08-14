/**
 * Serves locally-stored firmware and images during development.
 * On Vercel, files live in Blob storage and this route is never used.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { localUploadPath, usingBlob } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME = {
  '.bin': 'application/octet-stream',
  '.hex': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(_request, { params }) {
  if (usingBlob()) {
    return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const relative = (params.path || []).join('/');
  const target = localUploadPath(relative);
  if (!target) return Response.json({ success: false, error: 'Invalid path' }, { status: 400 });

  try {
    const file = await fs.readFile(target);
    return new Response(file, {
      headers: {
        'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': String(file.length),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
