import { readProjects } from '@/lib/store';
import { checkCompatibility, ok, fail } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const projects = await readProjects();
  const project = projects.find((p) => p.id === params.id);
  if (!project) return fail('Project not found', 404);

  const chip = new URL(request.url).searchParams.get('chip');
  return ok(checkCompatibility(project, chip));
}
