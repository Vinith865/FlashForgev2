/**
 * Storage layer.
 *
 *  • On Vercel  → @vercel/blob (firmware, images and the project index).
 *  • Locally    → ./data/projects.json + ./.uploads/** so you can develop
 *                 without any cloud credentials.
 *
 * The public API is identical in both modes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const INDEX_PATH = 'metadata/projects.json';
const LOCAL_DATA = path.join(process.cwd(), 'data', 'projects.json');
const LOCAL_UPLOADS = path.join(process.cwd(), '.uploads');

export const usingBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export function storageMode() {
  return usingBlob() ? 'vercel-blob' : 'local-filesystem';
}

/* ── Local helpers ──────────────────────────────────────────────────── */

async function readLocalIndex() {
  try {
    const raw = await fs.readFile(LOCAL_DATA, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalIndex(projects) {
  await fs.mkdir(path.dirname(LOCAL_DATA), { recursive: true });
  await fs.writeFile(LOCAL_DATA, JSON.stringify(projects, null, 2), 'utf8');
  return projects;
}

async function saveLocalFile(pathname, buffer) {
  const target = path.join(LOCAL_UPLOADS, pathname);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  // Served by app/api/uploads/[...path] — `public/` is snapshotted at build
  // time, so files written after the build would 404 under `next start`.
  return `/api/uploads/${pathname.split(path.sep).join('/')}`;
}

async function deleteLocalPrefix(prefix) {
  const target = path.join(LOCAL_UPLOADS, prefix);
  await fs.rm(target, { recursive: true, force: true }).catch(() => {});
}

/* ── Blob helpers ───────────────────────────────────────────────────── */

async function blob() {
  return import('@vercel/blob');
}

async function findBlobUrl(pathname) {
  const { list } = await blob();
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const hit = blobs.find((b) => b.pathname === pathname);
  return hit?.url || null;
}

async function putBlob(pathname, body, contentType) {
  const { put } = await blob();
  const result = await put(pathname, body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    // Blob rejects anything under 60s. The index is re-fetched with a
    // cache-buster anyway, so a short TTL is fine.
    cacheControlMaxAge: pathname === INDEX_PATH ? 60 : 31536000,
  });
  return result.url;
}

/* ── Public API ─────────────────────────────────────────────────────── */

export async function readProjects() {
  if (!usingBlob()) return readLocalIndex();

  const url = await findBlobUrl(INDEX_PATH);
  if (!url) return [];
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const parsed = await res.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeProjects(projects) {
  if (!usingBlob()) return writeLocalIndex(projects);
  await putBlob(INDEX_PATH, JSON.stringify(projects, null, 2), 'application/json');
  return projects;
}

/**
 * @param {string} pathname  e.g. "firmware/my-project/app.bin"
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<string>} public URL
 */
export async function saveFile(pathname, buffer, contentType = 'application/octet-stream') {
  if (!usingBlob()) return saveLocalFile(pathname, buffer);
  return putBlob(pathname, buffer, contentType);
}

export async function deleteProjectFiles(projectId) {
  if (!usingBlob()) {
    await deleteLocalPrefix(path.join('firmware', projectId));
    await deleteLocalPrefix(path.join('project-images', projectId));
    return;
  }
  const { list, del } = await blob();
  for (const prefix of [`firmware/${projectId}/`, `project-images/${projectId}`]) {
    const { blobs } = await list({ prefix });
    if (blobs.length) await del(blobs.map((b) => b.url)).catch(() => {});
  }
}

/** Absolute path of a locally-stored upload (local mode only). */
export function localUploadPath(relative) {
  const target = path.resolve(LOCAL_UPLOADS, relative);
  if (!target.startsWith(path.resolve(LOCAL_UPLOADS))) return null; // traversal guard
  return target;
}
