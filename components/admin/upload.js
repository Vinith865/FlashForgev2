'use client';

/** Shared upload helpers for the admin console. */

/**
 * Vercel caps a serverless request body at 4.5 MB. Base64 inflates by ~33%,
 * so anything under ~3 MB of raw firmware can safely go through the API
 * route — which works over an OIDC-connected Blob store with no extra token.
 * Larger files must stream straight from the browser, and that needs
 * BLOB_READ_WRITE_TOKEN.
 */
export const SERVER_UPLOAD_LIMIT = 3 * 1024 * 1024;

export const BLOB_TOKEN_HINT =
  'This upload is too large to route through the server. Add BLOB_READ_WRITE_TOKEN so the browser can stream directly to storage: Vercel → Storage → your Blob store → .env.local tab → copy the token → Settings → Environment Variables → redeploy.';

export const guessOffset = (name) =>
  /bootloader/i.test(name) ? 0x1000
  : /partition/i.test(name) ? 0x8000
  : /boot_?app|ota_?data/i.test(name) ? 0xe000
  : 0x10000;

export const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const slugOf = (name) =>
  String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Produces the `{ files, uploadedFiles }` pair the API expects.
 * On Blob deployments the browser streams straight to storage, which
 * sidesteps the 4.5 MB serverless request-body limit.
 */
export const totalBytes = (entries = [], image = null) =>
  entries.reduce((sum, e) => sum + (e.file?.size || 0), 0) + (image?.size || 0);

/**
 * @param {boolean} clientUploads  whether BLOB_READ_WRITE_TOKEN is available
 */
export async function buildUploadPayload({
  entries, image, slug, token, useBlob, clientUploads = true, onProgress,
}) {
  // Direct-to-Blob when we can; otherwise fall back to the API route, which
  // is fine for typical firmware sizes.
  const streamDirect = useBlob && clientUploads;
  if (useBlob && !clientUploads && totalBytes(entries, image) > SERVER_UPLOAD_LIMIT) {
    throw new Error(BLOB_TOKEN_HINT);
  }

  const payload = { files: [], uploadedFiles: [] };
  const total = entries.length + (image ? 1 : 0);
  let done = 0;

  const tick = (label) => {
    done += 1;
    onProgress?.(Math.round((done / Math.max(1, total)) * 100), label);
  };

  if (streamDirect) {
    const { upload } = await import('@vercel/blob/client');

    // The SDK reports any non-OK handshake as "Failed to retrieve the client
    // token", which hides the actual cause. Surface the real one.
    const wrap = async (fn) => {
      try {
        return await fn();
      } catch (error) {
        if (/client token/i.test(error?.message || '')) {
          throw new Error(BLOB_TOKEN_HINT);
        }
        throw error;
      }
    };

    for (const entry of entries) {
      const result = await wrap(() =>
        upload(`firmware/${slug}/${entry.file.name}`, entry.file, {
          access: 'public',
          handleUploadUrl: '/api/admin/blob-upload',
          clientPayload: token,
          contentType: 'application/octet-stream',
        })
      );
      payload.uploadedFiles.push({
        url: result.url,
        filename: entry.file.name,
        offset: entry.offset,
        size: entry.file.size,
      });
      tick(entry.file.name);
    }

    if (image) {
      const result = await wrap(() =>
        upload(`project-images/${slug}-${image.name}`, image, {
          access: 'public',
          handleUploadUrl: '/api/admin/blob-upload',
          clientPayload: token,
        })
      );
      payload.imageUrl = result.url;
      tick(image.name);
    }
    return payload;
  }

  for (const entry of entries) {
    payload.files.push({
      filename: entry.file.name,
      offset: entry.offset,
      content: await readAsBase64(entry.file),
    });
    tick(entry.file.name);
  }
  if (image) {
    payload.image = { filename: image.name, content: await readAsBase64(image) };
    tick(image.name);
  }
  return payload;
}
