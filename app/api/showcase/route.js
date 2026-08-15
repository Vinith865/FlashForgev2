import { readShowcase } from '@/lib/store';
import { sortItems } from '@/lib/showcase';
import { ok } from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await readShowcase();
  return ok(sortItems(items.filter((i) => !i.hidden)));
}
