/**
 * Shared firmware-upload handling for the admin routes.
 * Kept out of the route files themselves — one route importing another
 * creates a cycle in Next's app-router module graph and stalls the build.
 */
import { saveFile } from './store';
import { normaliseOffset } from './projects';

export const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;
export const FIRMWARE_EXT = new Set(['.bin', '.hex']);
export const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

export const extOf = (name) => {
  const i = String(name).lastIndexOf('.');
  return i === -1 ? '' : String(name).slice(i).toLowerCase();
};

export const decodeBase64 = (content) =>
  Buffer.from(String(content || '').replace(/^data:.*?;base64,/, ''), 'base64');

/**
 * Normalises both upload paths into one list of firmware parts.
 *  - `uploadedFiles` → already in Blob (client-direct, no size cap)
 *  - `files`         → base64 payload (local dev / small files)
 * Throws on invalid input so callers can surface the message directly.
 */
export async function collectFirmwareFiles({ projectId, files, uploadedFiles }) {
  const parts = [];

  for (const file of Array.isArray(uploadedFiles) ? uploadedFiles : []) {
    const offset = normaliseOffset(file.offset);
    if (!file.url) throw new Error('An uploaded firmware entry is missing its URL');
    if (!Number.isFinite(offset) || offset < 0) throw new Error(`Invalid offset for ${file.filename}`);
    parts.push({
      path: file.url,
      offset,
      filename: file.filename || file.url.split('/').pop(),
      size: Number(file.size) || 0,
    });
  }

  for (const file of Array.isArray(files) ? files : []) {
    const filename = String(file.filename || '').split(/[\\/]/).pop();
    const offset = normaliseOffset(file.offset);

    if (!filename || !SAFE_FILENAME.test(filename)) throw new Error(`Invalid firmware filename: ${filename || 'missing'}`);
    if (!FIRMWARE_EXT.has(extOf(filename))) throw new Error(`Firmware must be a .bin or .hex file: ${filename}`);
    if (!Number.isFinite(offset) || offset < 0) throw new Error(`Invalid offset for ${filename}`);

    const buffer = decodeBase64(file.content);
    if (!buffer.length) throw new Error(`Empty firmware file: ${filename}`);

    const url = await saveFile(`firmware/${projectId}/${filename}`, buffer, 'application/octet-stream');
    parts.push({ path: url, offset, filename, size: buffer.length });
  }

  return parts;
}
