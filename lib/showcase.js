/**
 * Showcase items: a thumbnail plus a link, shown as a carousel on the home
 * page. Deliberately separate from firmware projects — different lifecycle,
 * different people editing it, no reason to entangle the two.
 */

export const MAX_ITEMS = 24;

/** Pulls the video id out of any common YouTube URL shape. */
export function youTubeId(url) {
  const text = String(url || '').trim();
  if (!text) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/embed\/)([\w-]{11})/i,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
    /(?:youtube\.com\/live\/)([\w-]{11})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Highest-quality thumbnail YouTube will serve for an id. */
export const youTubeThumbnail = (id) =>
  id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : '';

export const isSafeLink = (url) => /^https?:\/\//i.test(String(url || '').trim());

export function normaliseItem(input = {}, existing = null) {
  const url = String(input.url || existing?.url || '').trim();
  const videoId = youTubeId(url);

  return {
    id: existing?.id || input.id,
    title: String(input.title ?? existing?.title ?? '').slice(0, 120),
    url,
    videoId,
    // An explicit upload wins; otherwise fall back to YouTube's own thumbnail.
    imageUrl: String(input.imageUrl ?? existing?.imageUrl ?? '') || youTubeThumbnail(videoId),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const sortItems = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
