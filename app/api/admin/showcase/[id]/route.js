import { requireAdmin } from '@/lib/auth';
import { audit, clientIp } from '@/lib/security';
import { readShowcase, writeShowcase, deleteFileByUrl, saveFile } from '@/lib/store';
import { withStorageErrors } from '@/lib/handler';
import { ok, fail } from '@/lib/projects';
import { isSafeLink, normaliseItem } from '@/lib/showcase';
import { decodeBase64, extOf, IMAGE_EXT } from '@/lib/firmware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handlePATCH(request, { params }) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const items = await readShowcase();
  const existing = items.find((i) => i.id === params.id);
  if (!existing) return fail('Item not found', 404);

  if (body.url !== undefined && !isSafeLink(body.url)) {
    return fail('Enter a full link starting with http:// or https://');
  }

  let imageUrl = body.imageUrl;
  if (body.image?.content && body.image?.filename) {
    const ext = extOf(body.image.filename);
    if (!IMAGE_EXT.has(ext)) return fail('Thumbnail must be JPG, PNG, WEBP, GIF or SVG');
    const buffer = decodeBase64(body.image.content);
    imageUrl = await saveFile(`showcase/${params.id}${ext}`, buffer, `image/${ext.slice(1)}`);
  }

  const updated = normaliseItem(
    { ...body, ...(imageUrl !== undefined ? { imageUrl } : {}) },
    existing
  );
  if (body.hidden !== undefined) updated.hidden = Boolean(body.hidden);
  else if (existing.hidden !== undefined) updated.hidden = existing.hidden;

  await writeShowcase(items.map((i) => (i.id === params.id ? updated : i)));
  await audit({
    action: 'showcase.update',
    actor: claims.sub,
    ip: clientIp(request),
    detail: updated.title,
  });

  return ok(updated);
}

async function handleDELETE(request, { params }) {
  const { denied, claims } = await requireAdmin(request);
  if (denied) return denied;

  const items = await readShowcase();
  const existing = items.find((i) => i.id === params.id);
  if (!existing) return fail('Item not found', 404);

  await writeShowcase(items.filter((i) => i.id !== params.id));
  // Only our own uploads live in storage; YouTube thumbnails are remote.
  if (existing.imageUrl?.includes('/showcase/')) {
    await deleteFileByUrl(existing.imageUrl).catch(() => {});
  }
  await audit({
    action: 'showcase.delete',
    actor: claims.sub,
    ip: clientIp(request),
    detail: existing.title,
  });

  return ok({ id: params.id, deleted: true });
}

export const PATCH = withStorageErrors(handlePATCH);
export const DELETE = withStorageErrors(handleDELETE);
