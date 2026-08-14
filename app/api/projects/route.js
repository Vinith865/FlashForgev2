import { readProjects } from '@/lib/store';
import { filterProjects, ok } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const board = searchParams.get('board') || 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '48', 10) || 48));

  const all = await readProjects();
  const filtered = filterProjects(all, { search, category, board });

  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return ok(items, {
    total: filtered.length,
    totalAll: all.length,
    page,
    limit,
    pages: Math.max(1, Math.ceil(filtered.length / limit)),
    categories: [...new Set(all.map((p) => p.category).filter(Boolean))].sort(),
    boards: [...new Set(all.flatMap((p) => p.supportedBoards || []))].sort(),
  });
}
