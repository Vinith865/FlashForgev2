/**
 * Client-direct upload handshake for Vercel Blob.
 * Lets the browser stream firmware straight to Blob storage, bypassing the
 * 4.5 MB serverless request-body limit.
 */
import { handleUpload } from '@vercel/blob/client';
import { verifyAdminToken } from '@/lib/auth';
import { canClientUpload } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!canClientUpload()) {
    return Response.json(
      {
        success: false,
        error:
          'Direct browser uploads need BLOB_READ_WRITE_TOKEN. Open your Blob store in Vercel, copy the read/write token, and add it as an environment variable.',
      },
      { status: 503 }
    );
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!(await verifyAdminToken(clientPayload || ''))) {
          throw new Error('Admin login required');
        }
        return {
          allowedContentTypes: [
            'application/octet-stream',
            'application/macbinary',
            'text/plain',
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/gif',
            'image/svg+xml',
          ],
          maximumSizeInBytes: 64 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
      onUploadCompleted: async () => {
        // Metadata is committed by POST /api/admin/projects.
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}
