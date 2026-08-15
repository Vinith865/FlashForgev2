'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Eye, EyeOff, ExternalLink, Image as ImageIcon, Link2, Loader2, Play, Plus, Trash2, X,
} from 'lucide-react';

import Panel, { PanelHeader } from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import { readAsBase64 } from './upload';
import { youTubeId, youTubeThumbnail } from '@/lib/showcase';
import {
  adminCreateShowcase, adminDeleteShowcase, adminListShowcase, adminUpdateShowcase,
} from '@/services/api';

const BLANK = { title: '', url: '', imageUrl: '' };

export default function ShowcaseManager({ token, onError, onSuccess, onUnauthorised }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    try {
      setItems(await adminListShowcase(token));
    } catch (err) {
      if (err.status === 401) onUnauthorised?.();
      else onError?.(err.message);
    }
  }, [token, onError, onUnauthorised]);

  useEffect(() => { load(); }, [load]);

  // Paste a YouTube link and the thumbnail comes for free.
  const derivedThumb = youTubeThumbnail(youTubeId(form.url));
  const preview = image ? URL.createObjectURL(image) : form.imageUrl || derivedThumb;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return onError?.('Give the item a title.');
    if (!/^https?:\/\//i.test(form.url)) return onError?.('Enter a full link starting with https://');

    setBusy(true);
    try {
      const payload = { title: form.title, url: form.url, imageUrl: form.imageUrl };
      if (image) {
        payload.image = { filename: image.name, content: await readAsBase64(image) };
      }
      const created = await adminCreateShowcase(token, payload);
      setItems((prev) => [created, ...prev]);
      setForm(BLANK);
      setImage(null);
      onSuccess?.(`Added “${created.title}” to the carousel.`);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleHidden = async (item) => {
    try {
      const updated = await adminUpdateShowcase(token, item.id, { hidden: !item.hidden });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      onError?.(err.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Remove “${item.title}” from the carousel?`)) return;
    try {
      await adminDeleteShowcase(token, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onSuccess?.('Removed from the carousel.');
    } catch (err) {
      onError?.(err.message);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Panel>
        <PanelHeader
          icon={Play}
          title="Add to carousel"
          subtitle="Thumbnails shown on the home page"
        />

        <form onSubmit={submit} className="space-y-4 px-5 pb-5">
          <div>
            <label className="label mb-1.5 block">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="field"
              placeholder="₹50 GPS tracker for your bike"
            />
          </div>

          <div>
            <label className="label mb-1.5 block">Link *</label>
            <div className="relative">
              <Link2 size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="field pl-10"
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
            {youTubeId(form.url) && (
              <p className="mt-1.5 text-[11px] text-ok-fg">
                YouTube link recognised — the thumbnail is filled in automatically.
              </p>
            )}
          </div>

          <div>
            <label className="label mb-2 block">Thumbnail</label>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} className="btn-ghost btn-sm">
                <ImageIcon size={13} /> {image ? 'Change' : 'Upload your own'}
              </button>
              {image && <span className="truncate text-xs text-ink-500">{image.name}</span>}
              {image && (
                <button type="button" onClick={() => setImage(null)} className="text-ink-400 hover:text-danger-fg">
                  <X size={13} />
                </button>
              )}
            </div>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="field mt-2"
              placeholder="…or paste an image URL"
            />
            <p className="mt-1.5 text-[11px] text-ink-500">
              Leave both empty for a YouTube link and its own thumbnail is used. 16:9 looks best.
            </p>
          </div>

          {preview && (
            <div>
              <p className="label mb-1.5">Preview</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="aspect-[16/9] w-full rounded-xl border border-hairline bg-canvas object-cover"
              />
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {busy ? 'Adding…' : 'Add to carousel'}
          </button>
        </form>
      </Panel>

      <Panel className="lg:sticky lg:top-6 lg:self-start">
        <PanelHeader icon={Play} title="In the carousel" subtitle={`${items.length} item(s)`} />

        {items.length === 0 ? (
          <EmptyState
            icon={Play}
            title="Carousel is empty"
            description="Add a video and its thumbnail appears in the space beside the headline on the home page."
          />
        ) : (
          <ul className="scroll-thin max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto px-5 pb-5">
            {items.map((item) => (
              <li
                key={item.id}
                className={clsx(
                  'row-hover flex items-center gap-3 rounded-xl border border-hairline bg-surface p-2.5',
                  item.hidden && 'opacity-55'
                )}
              >
                <div className="h-11 w-[72px] shrink-0 overflow-hidden rounded-lg border border-hairline bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-900">{item.title}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 truncate font-mono text-[10px] text-brand-600 hover:underline"
                  >
                    {item.videoId ? `youtu.be/${item.videoId}` : item.url.replace(/^https?:\/\//, '').slice(0, 28)}
                    <ExternalLink size={9} />
                  </a>
                </div>

                <button
                  onClick={() => toggleHidden(item)}
                  title={item.hidden ? 'Show in carousel' : 'Hide from carousel'}
                  className="rounded-lg p-1.5 text-ink-400 transition hover:bg-muted hover:text-ink-700"
                >
                  {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={() => remove(item)}
                  title="Remove"
                  className="rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-bg hover:text-danger-fg"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
