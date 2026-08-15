import { requireAdmin } from '@/lib/auth';
import { audit, clientIp } from '@/lib/security';
import { readProjects, writeProjects, saveFile, usingBlob } from '@/lib/store';
import { slugify, ok, fail } from '@/lib/projects';
import { withStorageErrors } from '@/lib/handler';
import { collectFirmwareFiles, decodeBase64, extOf, IMAGE_EXT } from '@/lib/firmware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* ── List (includes drafts) ─────────────────────────────────────────── */

export async function GET(request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  return ok(await readProjects());
}

/* ── Create / replace ───────────────────────────────────────────────── */

async function handlePOST(request) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const {
    name, description, longDescription, version, category, supportedBoards, tags,
    flashMode, flashFreq, flashSize, eraseAll, sourceUrl, docsUrl, imageUrl, image,
    files, uploadedFiles, draft,
  } = body || {};

  const id = slugify(body?.id || name);
  if (!id) return fail('Project name is required');

  const boards = Array.isArray(supportedBoards)
    ? supportedBoards.filter(Boolean)
    : String(supportedBoards || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!boards.length) return fail('Select at least one supported board');

  let firmwareFiles;
  try {
    firmwareFiles = await collectFirmwareFiles({ projectId: id, files, uploadedFiles });
  } catch (err) {
    return fail(err.message);
  }
  if (!firmwareFiles.length) return fail('Upload at least one firmware file');

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
    draft: Boolean(draft),
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
  };

  await writeProjects(existing ? projects.map((p) => (p.id === id ? record : p)) : [record, ...projects]);
  await audit({
    action: existing ? 'project.replace' : 'project.create',
    actor: claims.sub,
    ip: clientIp(request),
    detail: `${record.name} v${record.version} · ${firmwareFiles.length} file(s)${record.draft ? ' · draft' : ''}`,
  });

  return Response.json({ success: true, data: record }, { status: existing ? 200 : 201 });
}

export const POST = withStorageErrors(handlePOST);
