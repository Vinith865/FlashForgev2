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
const SECURITY_PATH = 'metadata/security.json';
const LOCAL_DATA = path.join(process.cwd(), 'data', 'projects.json');
const LOCAL_SECURITY = path.join(process.cwd(), 'data', 'security.json');
const LOCAL_UPLOADS = path.join(process.cwd(), '.uploads');

/**
 * Vercel connects Blob stores over OIDC by default, which injects
 * BLOB_STORE_ID (plus a rotating VERCEL_OIDC_TOKEN) rather than the
 * long-lived BLOB_READ_WRITE_TOKEN. Detecting only the latter makes a
 * perfectly healthy store look absent.
 */
export const usingBlob = () =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/** Client-direct uploads mint tokens, which needs the static read/write token. */
export const canClientUpload = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const onVercel = () => Boolean(process.env.VERCEL);

export function storageMode() {
  if (usingBlob()) return 'vercel-blob';
  return onVercel() ? 'unconfigured' : 'local-filesystem';
}

export class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
    this.userFacing = true;
  }
}

/**
 * Vercel's filesystem is read-only, so a local write there fails deep inside
 * fs with an opaque EROFS. Fail early with something actionable instead.
 */
function assertWritable() {
  if (usingBlob() || !onVercel()) return;
  throw new StorageError(
    'No Blob store is connected to this deployment, so nothing can be saved. ' +
      'In Vercel: Storage → create or open a PUBLIC Blob store → Projects → ' +
      'Connect to Project → then redeploy.'
  );
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
  assertWritable();
  await fs.mkdir(path.dirname(LOCAL_DATA), { recursive: true });
  await fs.writeFile(LOCAL_DATA, JSON.stringify(projects, null, 2), 'utf8');
  return projects;
}

async function saveLocalFile(pathname, buffer) {
  assertWritable();
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

/**
 * Blob writes take up to 60 seconds to propagate through the CDN, so reading
 * an index back immediately after saving it can return the previous copy —
 * which made a freshly published project still look like a draft. Remember
 * what we just wrote and serve that until the CDN catches up.
 */
const WRITE_CACHE_MS = 90_000;
let lastWrite = { projects: null, at: 0 };

export async function readProjects() {
  if (lastWrite.projects && Date.now() - lastWrite.at < WRITE_CACHE_MS) {
    return lastWrite.projects;
  }
  return readProjectsFromStore();
}

async function readProjectsFromStore() {
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
  lastWrite = { projects, at: Date.now() };
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

/** Removes a single stored file, given the URL we recorded for it. */
export async function deleteFileByUrl(url) {
  if (!url) return;

  if (!usingBlob()) {
    const marker = '/api/uploads/';
    const index = String(url).indexOf(marker);
    if (index === -1) return;
    const relative = String(url).slice(index + marker.length);
    const target = localUploadPath(relative);
    if (target) await fs.rm(target, { force: true }).catch(() => {});
    return;
  }

  const { del } = await blob();
  await del(url).catch(() => {});
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

/* ── Security / audit document ──────────────────────────────────────── */

export async function readSecurityDoc() {
  const fallback = { epoch: 1, lastTotpStep: 0, failures: [], audit: [] };

  if (!usingBlob()) {
    try {
      const parsed = JSON.parse(await fs.readFile(LOCAL_SECURITY, 'utf8'));
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  }

  const url = await findBlobUrl(SECURITY_PATH);
  if (!url) return fallback;
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return { ...fallback, ...(await res.json()) };
  } catch {
    return fallback;
  }
}

export async function writeSecurityDoc(doc) {
  const payload = JSON.stringify(doc, null, 2);
  if (!usingBlob()) {
    assertWritable();
    await fs.mkdir(path.dirname(LOCAL_SECURITY), { recursive: true });
    await fs.writeFile(LOCAL_SECURITY, payload, 'utf8');
    return doc;
  }
  await putBlob(SECURITY_PATH, payload, 'application/json');
  return doc;
}

/** Absolute path of a locally-stored upload (local mode only). */
export function localUploadPath(relative) {
  const target = path.resolve(LOCAL_UPLOADS, relative);
  if (!target.startsWith(path.resolve(LOCAL_UPLOADS))) return null; // traversal guard
  return target;
}
