import { requireAdmin } from '@/lib/auth';
import { audit, clientIp } from '@/lib/security';
import { readShowcase, writeShowcase, saveFile } from '@/lib/store';
import { withStorageErrors } from '@/lib/handler';
import { ok, fail, slugify } from '@/lib/projects';
import { MAX_ITEMS, isSafeLink, normaliseItem, sortItems } from '@/lib/showcase';
import { decodeBase64, extOf, IMAGE_EXT } from '@/lib/firmware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  return ok(sortItems(await readShowcase()));
}

async function handlePOST(request) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const { title, url, image, imageUrl } = body || {};
  if (!String(title || '').trim()) return fail('Give the item a title');
  if (!isSafeLink(url)) return fail('Enter a full link starting with http:// or https://');

  const items = await readShowcase();
  if (items.length >= MAX_ITEMS) return fail(`The carousel holds at most ${MAX_ITEMS} items`);

  const id = `${slugify(title).slice(0, 40) || 'item'}-${Date.now().toString(36)}`;

  let storedImage = String(imageUrl || '');
  if (image?.content && image?.filename) {
    const ext = extOf(image.filename);
    if (!IMAGE_EXT.has(ext)) return fail('Thumbnail must be JPG, PNG, WEBP, GIF or SVG');
    const buffer = decodeBase64(image.content);
    if (!buffer.length) return fail('The thumbnail file is empty');
    storedImage = await saveFile(`showcase/${id}${ext}`, buffer, `image/${ext.slice(1)}`);
  }

  const item = normaliseItem({ id, title, url, imageUrl: storedImage });
  if (!item.imageUrl) {
    return fail('Add a thumbnail, or use a YouTube link so one can be derived');
  }

  await writeShowcase([item, ...items]);
  await audit({
    action: 'showcase.create',
    actor: claims.sub,
    ip: clientIp(request),
    detail: item.title,
  });

  return Response.json({ success: true, data: item }, { status: 201 });
}

export const POST = withStorageErrors(handlePOST);
