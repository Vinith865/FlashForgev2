import { requireAdmin } from '@/lib/auth';
import { audit, clientIp } from '@/lib/security';
import { readProjects, writeProjects, deleteProjectFiles } from '@/lib/store';
import { ok, fail } from '@/lib/projects';
import { withStorageErrors } from '@/lib/handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EDITABLE_TEXT = [
  'name', 'description', 'longDescription', 'version',
  'category', 'docsUrl', 'sourceUrl', 'thumbnailUrl',
];
const EDITABLE_FIRMWARE = ['flashMode', 'flashFreq', 'flashSize'];

export async function GET(request, { params }) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  const project = (await readProjects()).find((p) => p.id === params.id);
  if (!project) return fail('Project not found', 404);
  return ok(project);
}

/** Partial edit — metadata, boards, tags, draft state, flash parameters. */
async function handlePATCH(request, { params }) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const projects = await readProjects();
  const project = projects.find((p) => p.id === params.id);
  if (!project) return fail('Project not found', 404);

  const next = { ...project, firmware: { ...project.firmware } };
  const changed = [];

  for (const key of EDITABLE_TEXT) {
    if (body[key] !== undefined) {
      next[key] = String(body[key]).slice(0, key === 'longDescription' ? 4000 : 300);
      changed.push(key);
    }
  }

  for (const key of EDITABLE_FIRMWARE) {
    if (body[key] !== undefined) {
      next.firmware[key] = String(body[key]);
      changed.push(key);
    }
  }

  if (body.supportedBoards !== undefined) {
    const boards = Array.isArray(body.supportedBoards)
      ? body.supportedBoards.filter(Boolean)
      : String(body.supportedBoards).split(',').map((s) => s.trim()).filter(Boolean);
    if (!boards.length) return fail('Select at least one supported board');
    next.supportedBoards = boards;
    next.firmware.chipFamily = boards;
    changed.push('supportedBoards');
  }

  if (body.tags !== undefined) {
    next.tags = (Array.isArray(body.tags)
      ? body.tags
      : String(body.tags).split(',').map((t) => t.trim())
    ).filter(Boolean).slice(0, 12);
    changed.push('tags');
  }

  if (body.draft !== undefined) {
    next.draft = Boolean(body.draft);
    changed.push(next.draft ? 'draft' : 'published');
  }

  if (body.eraseAll !== undefined) {
    next.firmware.eraseAll = Boolean(body.eraseAll);
    changed.push('eraseAll');
  }

  if (!changed.length) return fail('Nothing to update');

  next.updatedAt = new Date().toISOString();
  await writeProjects(projects.map((p) => (p.id === params.id ? next : p)));
  await audit({
    action: 'project.update',
    actor: claims.sub,
    ip: clientIp(request),
    detail: `${next.name} · ${changed.join(', ')}`,
  });

  return ok(next);
}

async function handleDELETE(request, { params }) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  const projects = await readProjects();
  const project = projects.find((p) => p.id === params.id);
  if (!project) return fail('Project not found', 404);

  await writeProjects(projects.filter((p) => p.id !== params.id));
  await deleteProjectFiles(params.id).catch(() => {});
  await audit({
    action: 'project.delete',
    actor: claims.sub,
    ip: clientIp(request),
    detail: `${project.name} (${params.id})`,
  });

  return ok({ id: params.id, deleted: true });
}

export const PATCH = withStorageErrors(handlePATCH);
export const DELETE = withStorageErrors(handleDELETE);
