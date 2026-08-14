import { readProjects } from '@/lib/store';
import { ok, fail } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const projects = await readProjects();
  const project = projects.find((p) => p.id === params.id);
  if (!project || project.draft) return fail('Project not found', 404);
  return ok(project);
}
