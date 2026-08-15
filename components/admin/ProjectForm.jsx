'use client';

import { useRef } from 'react';
import clsx from 'clsx';
import { CloudUpload, FileCode2, Image as ImageIcon, Loader2, Plus, Save, X } from 'lucide-react';
import { BOARDS, DEFAULT_CATEGORIES } from '@/lib/projects';
import { guessOffset } from './upload';

export const BLANK = {
  name: '', description: '', longDescription: '', version: '1.0.0',
  category: 'Student Projects', supportedBoards: ['ESP32'], tags: '',
  flashMode: 'dio', flashFreq: '40m', flashSize: 'keep', eraseAll: false,
  docsUrl: '', sourceUrl: '', imageUrl: '', draft: false,
};

const FLASH_FIELDS = [
  { key: 'flashMode', label: 'Flash mode', options: ['dio', 'qio', 'dout', 'qout', 'keep'] },
  { key: 'flashFreq', label: 'Flash freq', options: ['40m', '80m', '26m', '20m', 'keep'] },
  { key: 'flashSize', label: 'Flash size', options: ['keep', '1MB', '2MB', '4MB', '8MB', '16MB'] },
];

export default function ProjectForm({
  form, setForm, firmware, setFirmware, image, setImage,
  editing, busy, progress, onSubmit, onCancelEdit,
}) {
  const fwInput = useRef(null);
  const imgInput = useRef(null);

  const addFirmware = (list) => {
    const incoming = Array.from(list || []).filter((f) => /\.(bin|hex)$/i.test(f.name));
    if (!incoming.length) return;
    setFirmware((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: `${file.name}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        offset: guessOffset(file.name),
      })),
    ]);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label mb-1.5 block">Project name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field"
            placeholder="Smart Home Hub"
            disabled={editing}
          />
          {editing && <p className="mt-1 text-[11px] text-ink-500">The name is the project ID and can&apos;t change here.</p>}
        </div>
        <div>
          <label className="label mb-1.5 block">Version</label>
          <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="field" />
        </div>
      </div>

      <div>
        <label className="label mb-1.5 block">Short description</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="field"
          placeholder="MQTT hub with OTA updates"
        />
      </div>

      <div>
        <label className="label mb-1.5 block">Full description</label>
        <textarea
          rows={3}
          value={form.longDescription}
          onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
          className="field resize-y"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label mb-1.5 block">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field">
            {DEFAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label mb-1.5 block">Tags (comma separated)</label>
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="field" placeholder="wifi, mqtt, ota" />
        </div>
      </div>

      <div>
        <label className="label mb-2 block">Supported boards *</label>
        <div className="flex flex-wrap gap-1.5">
          {BOARDS.map((b) => {
            const active = form.supportedBoards.includes(b);
            return (
              <button
                key={b}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    supportedBoards: active
                      ? form.supportedBoards.filter((x) => x !== b)
                      : [...form.supportedBoards, b],
                  })
                }
                className={clsx('chip', active && 'chip-active')}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {FLASH_FIELDS.map(({ key, label, options }) => (
          <div key={key}>
            <label className="label mb-1.5 block">{label}</label>
            <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="field">
              {options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {!editing && (
        <div>
          <label className="label mb-2 block">Firmware files *</label>
          <input
            ref={fwInput}
            type="file"
            multiple
            accept=".bin,.hex"
            className="hidden"
            onChange={(e) => { addFirmware(e.target.files); e.target.value = ''; }}
          />
          <button type="button" onClick={() => fwInput.current?.click()} className="btn-ghost btn-sm w-full">
            <Plus size={13} /> Add .bin / .hex
          </button>

          {firmware.length > 0 && (
            <ul className="mt-2 space-y-2">
              {firmware.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2">
                  <FileCode2 size={15} className="shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink-900">{entry.file.name}</p>
                    <p className="font-mono text-[10px] text-ink-500">{(entry.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <span className="font-mono text-[10px] text-ink-500">Hex:</span>
                  <input
                    value={Number(entry.offset).toString(16)}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value || '0', 16);
                      setFirmware((prev) =>
                        prev.map((x) => (x.id === entry.id ? { ...x, offset: Number.isFinite(parsed) ? parsed : 0 } : x))
                      );
                    }}
                    className="field field-sm w-24 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setFirmware((prev) => prev.filter((x) => x.id !== entry.id))}
                    className="rounded p-1 text-ink-400 hover:text-red-500"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label className="label mb-2 block">Cover image</label>
        <input ref={imgInput} type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => imgInput.current?.click()} className="btn-ghost btn-sm">
            <ImageIcon size={13} /> {image ? 'Change' : 'Choose image'}
          </button>
          {image && <span className="truncate text-xs text-ink-500">{image.name}</span>}
          {image && (
            <button type="button" onClick={() => setImage(null)} className="text-ink-400 hover:text-red-500">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label mb-1.5 block">Docs URL</label>
          <input value={form.docsUrl} onChange={(e) => setForm({ ...form, docsUrl: e.target.value })} className="field" />
        </div>
        <div>
          <label className="label mb-1.5 block">Source URL</label>
          <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} className="field" />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3.5 py-2.5">
          <input type="checkbox" checked={form.eraseAll} onChange={(e) => setForm({ ...form, eraseAll: e.target.checked })} className="h-4 w-4 rounded accent-brand-600" />
          <span className="text-sm text-ink-700">Recommend a full erase</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3.5 py-2.5">
          <input type="checkbox" checked={form.draft} onChange={(e) => setForm({ ...form, draft: e.target.checked })} className="h-4 w-4 rounded accent-amber-500" />
          <span className="text-sm text-ink-700">Save as draft</span>
          <span className="ml-auto rounded bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-700">hidden</span>
        </label>
      </div>

      {busy && progress > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex gap-2">
        {editing && (
          <button type="button" onClick={onCancelEdit} className="btn-ghost flex-1">Cancel</button>
        )}
        <button type="submit" disabled={busy} className="btn-primary flex-1 py-3">
          {busy ? <Loader2 size={14} className="animate-spin" /> : editing ? <Save size={14} /> : <CloudUpload size={14} />}
          {busy ? 'Working…' : editing ? 'Save changes' : 'Publish project'}
        </button>
      </div>
    </form>
  );
}
