import { requireAdmin } from '@/lib/auth';
import { readProjects, writeProjects, deleteProjectFiles } from '@/lib/store';
import { ok, fail } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const projects = await readProjects();
  if (!projects.some((p) => p.id === params.id)) return fail('Project not found', 404);

  await writeProjects(projects.filter((p) => p.id !== params.id));
  await deleteProjectFiles(params.id).catch(() => {});

  return ok({ id: params.id, deleted: true });
}
