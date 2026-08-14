/**
 * Per-file firmware management: add a .bin to an existing project, change a
 * single offset, or remove one part — without touching the rest.
 */
import { requireAdmin } from '@/lib/auth';
import { audit, clientIp } from '@/lib/security';
import { readProjects, writeProjects, deleteFileByUrl } from '@/lib/store';
import { normaliseOffset, ok, fail } from '@/lib/projects';
import { collectFirmwareFiles } from '@/lib/firmware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function loadProject(id) {
  const projects = await readProjects();
  return { projects, project: projects.find((p) => p.id === id) };
}

async function persist(projects, id, project, { actor, ip, action, detail }) {
  project.updatedAt = new Date().toISOString();
  await writeProjects(projects.map((p) => (p.id === id ? project : p)));
  await audit({ action, actor, ip, detail });
  return project;
}

/** Add one or more firmware parts. */
export async function POST(request, { params }) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const { projects, project } = await loadProject(params.id);
  if (!project) return fail('Project not found', 404);

  let added;
  try {
    added = await collectFirmwareFiles({
      projectId: params.id,
      files: body.files,
      uploadedFiles: body.uploadedFiles,
    });
  } catch (err) {
    return fail(err.message);
  }
  if (!added.length) return fail('No firmware files supplied');

  const existing = project.firmware?.files || [];
  const kept = existing.filter((f) => !added.some((a) => a.filename === f.filename));
  project.firmware = { ...project.firmware, files: [...kept, ...added] };

  await persist(projects, params.id, project, {
    actor: claims.sub,
    ip: clientIp(request),
    action: 'file.add',
    detail: `${project.name} ← ${added.map((f) => f.filename).join(', ')}`,
  });

  return Response.json({ success: true, data: project }, { status: 201 });
}

/** Change the flash offset of one part. */
export async function PATCH(request, { params }) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const filename = String(body.filename || '');
  const offset = normaliseOffset(body.offset);
  if (!filename) return fail('filename is required');
  if (!Number.isFinite(offset) || offset < 0) return fail('A valid offset is required');

  const { projects, project } = await loadProject(params.id);
  if (!project) return fail('Project not found', 404);

  const files = project.firmware?.files || [];
  const target = files.find((f) => f.filename === filename);
  if (!target) return fail(`No file named ${filename} in this project`, 404);

  const previous = target.offset;
  project.firmware = {
    ...project.firmware,
    files: files.map((f) => (f.filename === filename ? { ...f, offset } : f)),
  };

  await persist(projects, params.id, project, {
    actor: claims.sub,
    ip: clientIp(request),
    action: 'file.offset',
    detail: `${project.name} · ${filename} 0x${Number(previous).toString(16)} → 0x${offset.toString(16)}`,
  });

  return ok(project);
}

/** Remove a single part. */
export async function DELETE(request, { params }) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  const filename = new URL(request.url).searchParams.get('filename');
  if (!filename) return fail('filename query parameter is required');

  const { projects, project } = await loadProject(params.id);
  if (!project) return fail('Project not found', 404);

  const files = project.firmware?.files || [];
  const target = files.find((f) => f.filename === filename);
  if (!target) return fail(`No file named ${filename} in this project`, 404);
  if (files.length === 1) {
    return fail('A project needs at least one firmware file. Delete the project instead.');
  }

  project.firmware = { ...project.firmware, files: files.filter((f) => f.filename !== filename) };
  await deleteFileByUrl(target.path).catch(() => {});

  await persist(projects, params.id, project, {
    actor: claims.sub,
    ip: clientIp(request),
    action: 'file.delete',
    detail: `${project.name} · ${filename}`,
  });

  return ok(project);
}
