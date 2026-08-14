import { requireAdmin } from '@/lib/auth';
import { readProjects, writeProjects, saveFile, usingBlob } from '@/lib/store';
import { slugify, normaliseOffset, ok, fail } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;
const FIRMWARE_EXT = new Set(['.bin', '.hex']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

const extOf = (name) => {
  const i = String(name).lastIndexOf('.');
  return i === -1 ? '' : String(name).slice(i).toLowerCase();
};

const decodeBase64 = (content) =>
  Buffer.from(String(content || '').replace(/^data:.*?;base64,/, ''), 'base64');

/* ── List ───────────────────────────────────────────────────────────── */

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return ok(await readProjects());
}

/* ── Create / update ────────────────────────────────────────────────── */

export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const {
    name,
    description,
    longDescription,
    version,
    category,
    supportedBoards,
    tags,
    flashMode,
    flashFreq,
    flashSize,
    eraseAll,
    sourceUrl,
    docsUrl,
    imageUrl,
    image,
    files,
    uploadedFiles,
  } = body || {};

  const id = slugify(body?.id || name);
  if (!id) return fail('Project name is required');

  const boards = Array.isArray(supportedBoards)
    ? supportedBoards.filter(Boolean)
    : String(supportedBoards || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  if (!boards.length) return fail('Select at least one supported board');

  /* Firmware files can arrive two ways:
     1. uploadedFiles → already in Blob (client-direct upload, no size cap)
     2. files         → base64 payload (local dev / small files)            */
  const firmwareFiles = [];

  for (const file of Array.isArray(uploadedFiles) ? uploadedFiles : []) {
    const offset = normaliseOffset(file.offset);
    if (!file.url) return fail('Uploaded firmware entry is missing its URL');
    if (!Number.isFinite(offset) || offset < 0) return fail(`Invalid offset for ${file.filename}`);
    firmwareFiles.push({
      path: file.url,
      offset,
      filename: file.filename || file.url.split('/').pop(),
      size: Number(file.size) || 0,
    });
  }

  for (const file of Array.isArray(files) ? files : []) {
    const filename = String(file.filename || '').split(/[\\/]/).pop();
    const offset = normaliseOffset(file.offset);

    if (!filename || !SAFE_FILENAME.test(filename)) return fail(`Invalid firmware filename: ${filename || 'missing'}`);
    if (!FIRMWARE_EXT.has(extOf(filename))) return fail(`Firmware must be a .bin or .hex file: ${filename}`);
    if (!Number.isFinite(offset) || offset < 0) return fail(`Invalid offset for ${filename}`);

    const buffer = decodeBase64(file.content);
    if (!buffer.length) return fail(`Empty firmware file: ${filename}`);

    const url = await saveFile(`firmware/${id}/${filename}`, buffer, 'application/octet-stream');
    firmwareFiles.push({ path: url, offset, filename, size: buffer.length });
  }

  if (!firmwareFiles.length) return fail('Upload at least one firmware file');

  /* Project image */
  let thumbnailUrl = String(imageUrl || '');
  if (image?.content && image?.filename) {
    const ext = extOf(image.filename);
    if (!IMAGE_EXT.has(ext)) return fail('Project image must be JPG, PNG, WEBP, GIF or SVG');
    const buffer = decodeBase64(image.content);
    thumbnailUrl = await saveFile(`project-images/${id}${ext}`, buffer, `image/${ext.slice(1)}`);
  }

  const projects = await readProjects();
  const existing = projects.find((p) => p.id === id);

  const record = {
    id,
    name: String(name || id).slice(0, 120),
    description: String(description || 'Firmware project').slice(0, 300),
    longDescription: String(longDescription || description || '').slice(0, 4000),
    version: String(version || '1.0.0').slice(0, 32),
    category: String(category || 'Student Projects').slice(0, 64),
    supportedBoards: boards,
    tags: Array.isArray(tags)
      ? tags.slice(0, 12)
      : String(tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
    thumbnailUrl,
    docsUrl: String(docsUrl || ''),
    sourceUrl: String(sourceUrl || ''),
    firmware: {
      chipFamily: boards,
      flashMode: String(flashMode || 'dio'),
      flashFreq: String(flashFreq || '40m'),
      flashSize: String(flashSize || 'keep'),
      eraseAll: Boolean(eraseAll),
      files: firmwareFiles,
    },
    storage: usingBlob() ? 'vercel-blob' : 'local',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloads: existing?.downloads || 0,
  };

  const next = existing
    ? projects.map((p) => (p.id === id ? record : p))
    : [record, ...projects];

  await writeProjects(next);
  return Response.json({ success: true, data: record }, { status: existing ? 200 : 201 });
}
