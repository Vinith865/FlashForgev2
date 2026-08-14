'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowLeft, CloudUpload, Database, FileCode2, Image as ImageIcon, KeyRound,
  Loader2, LogOut, Plus, ShieldCheck, Trash2, X,
} from 'lucide-react';

import Panel, { PanelHeader } from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import {
  adminDeleteProject, adminListProjects, adminLogin, adminSaveProject, fetchHealth,
} from '@/services/api';
import { BOARDS, DEFAULT_CATEGORIES } from '@/lib/projects';

const TOKEN_KEY = 'flasher:admin-token';

const BLANK = {
  name: '', description: '', longDescription: '', version: '1.0.0',
  category: 'Student Projects', supportedBoards: ['ESP32'], tags: '',
  flashMode: 'dio', flashFreq: '40m', flashSize: 'keep', eraseAll: false,
  docsUrl: '', sourceUrl: '', imageUrl: '',
};

const guessOffset = (name) =>
  /bootloader/i.test(name) ? 0x1000
  : /partition/i.test(name) ? 0x8000
  : /boot_?app|ota_?data/i.test(name) ? 0xe000
  : 0x10000;

const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AdminConsole() {
  const [token, setToken] = useState('');
  const [health, setHealth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [firmware, setFirmware] = useState([]); // [{file, offset, id}]
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [credentials, setCredentials] = useState({ username: 'admin', password: '' });

  const fwInput = useRef(null);
  const imgInput = useRef(null);

  const flash = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 6000);
  };

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => {});
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const refresh = useCallback(async (activeToken) => {
    try {
      setProjects(await adminListProjects(activeToken));
    } catch (err) {
      if (String(err.message).includes('login')) {
        setToken('');
        window.localStorage.removeItem(TOKEN_KEY);
      }
      flash('error', err.message);
    }
  }, []);

  useEffect(() => {
    if (token) refresh(token);
  }, [token, refresh]);

  /* ── Auth ─────────────────────────────────────────────────────────── */

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { token: t } = await adminLogin(credentials.username, credentials.password);
      window.localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      flash('success', 'Signed in.');
    } catch (err) {
      flash('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setProjects([]);
  };

  /* ── Upload ───────────────────────────────────────────────────────── */

  const addFirmware = (list) => {
    const incoming = Array.from(list || []).filter((f) => /\.(bin|hex)$/i.test(f.name));
    if (!incoming.length) return flash('error', 'Only .bin and .hex files are accepted.');
    setFirmware((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: `${file.name}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        offset: guessOffset(file.name),
      })),
    ]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return flash('error', 'Give the project a name.');
    if (!firmware.length) return flash('error', 'Attach at least one firmware file.');
    if (!form.supportedBoards.length) return flash('error', 'Select at least one board.');

    setBusy(true);
    try {
      const slug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const payload = { ...form, tags: form.tags, files: [], uploadedFiles: [] };

      if (health?.storage === 'vercel-blob') {
        // Stream straight to Blob — sidesteps the 4.5 MB serverless body limit.
        const { upload } = await import('@vercel/blob/client');
        for (const entry of firmware) {
          const result = await upload(`firmware/${slug}/${entry.file.name}`, entry.file, {
            access: 'public',
            handleUploadUrl: '/api/admin/blob-upload',
            clientPayload: token,
            contentType: 'application/octet-stream',
          });
          payload.uploadedFiles.push({
            url: result.url,
            filename: entry.file.name,
            offset: entry.offset,
            size: entry.file.size,
          });
        }
        if (image) {
          const result = await upload(`project-images/${slug}-${image.name}`, image, {
            access: 'public',
            handleUploadUrl: '/api/admin/blob-upload',
            clientPayload: token,
          });
          payload.imageUrl = result.url;
        }
      } else {
        for (const entry of firmware) {
          payload.files.push({
            filename: entry.file.name,
            offset: entry.offset,
            content: await readAsBase64(entry.file),
          });
        }
        if (image) {
          payload.image = { filename: image.name, content: await readAsBase64(image) };
        }
      }

      const saved = await adminSaveProject(token, payload);
      flash('success', `Saved “${saved.name}”.`);
      setForm(BLANK);
      setFirmware([]);
      setImage(null);
      refresh(token);
    } catch (err) {
      flash('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete “${id}” and its firmware files?`)) return;
    try {
      await adminDeleteProject(token, id);
      flash('success', 'Project deleted.');
      refresh(token);
    } catch (err) {
      flash('error', err.message);
    }
  };

  /* ── Login screen ─────────────────────────────────────────────────── */

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Panel className="w-full max-w-sm animate-slideUp p-7">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-neon-violet/25 bg-neon-violet/10">
              <ShieldCheck size={22} className="text-neon-violet" />
            </span>
            <h1 className="text-lg font-semibold text-slate-100">Admin console</h1>
            <p className="mt-1 text-xs text-slate-500">Sign in to publish firmware projects.</p>
          </div>

          <form onSubmit={login} className="space-y-3">
            <div>
              <label className="label mb-1.5 block">Username</label>
              <input
                value={credentials.username}
                onChange={(e) => setCredentials((c) => ({ ...c, username: e.target.value }))}
                className="field"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label mb-1.5 block">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))}
                className="field"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Sign in
            </button>
          </form>

          {notice && (
            <p className={clsx('mt-4 rounded-xl px-3 py-2 text-xs', notice.type === 'error' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300')}>
              {notice.text}
            </p>
          )}

          {health && !health.adminConfigured && (
            <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
              No admin password is configured. Run <span className="font-mono">node scripts/hash-password.mjs</span> and
              set <span className="font-mono">ADMIN_PASSWORD_HASH</span> plus <span className="font-mono">ADMIN_TOKEN_SECRET</span>.
            </p>
          )}

          <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft size={12} /> Back to flasher
          </Link>
        </Panel>
      </main>
    );
  }

  /* ── Console ──────────────────────────────────────────────────────── */

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Admin console</h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <Database size={12} />
            Storage: <span className="font-mono text-slate-400">{health?.storage || '…'}</span>
            {health?.storage === 'local-filesystem' && (
              <span className="text-amber-400">· local only, not persisted on Vercel</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn-ghost btn-sm"><ArrowLeft size={13} /> Flasher</Link>
          <button onClick={logout} className="btn-ghost btn-sm"><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      {notice && (
        <div className={clsx(
          'mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-xs animate-slideUp',
          notice.type === 'error' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
        )}>
          {notice.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Upload form */}
        <Panel>
          <PanelHeader icon={CloudUpload} title="Publish firmware" subtitle="Files stream straight to storage" />
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label mb-1.5 block">Project name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" placeholder="Smart Home Hub" />
              </div>
              <div>
                <label className="label mb-1.5 block">Version</label>
                <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="field" />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Short description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field" placeholder="MQTT hub with OTA updates" />
            </div>

            <div>
              <label className="label mb-1.5 block">Full description</label>
              <textarea rows={3} value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} className="field resize-y" />
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
              {[
                { key: 'flashMode', options: ['dio', 'qio', 'dout', 'qout', 'keep'] },
                { key: 'flashFreq', options: ['40m', '80m', '26m', '20m', 'keep'] },
                { key: 'flashSize', options: ['keep', '1MB', '2MB', '4MB', '8MB', '16MB'] },
              ].map(({ key, options }) => (
                <div key={key}>
                  <label className="label mb-1.5 block">{key.replace('flash', 'Flash ')}</label>
                  <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="field">
                    {options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Firmware files */}
            <div>
              <label className="label mb-2 block">Firmware files *</label>
              <input ref={fwInput} type="file" multiple accept=".bin,.hex" className="hidden"
                onChange={(e) => { addFirmware(e.target.files); e.target.value = ''; }} />
              <button type="button" onClick={() => fwInput.current?.click()} className="btn-ghost btn-sm w-full">
                <Plus size={13} /> Add .bin / .hex
              </button>

              {firmware.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {firmware.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <FileCode2 size={14} className="shrink-0 text-neon-violet" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-slate-200">{entry.file.name}</p>
                        <p className="font-mono text-[10px] text-slate-500">{(entry.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">0x</span>
                      <input
                        value={Number(entry.offset).toString(16)}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value || '0', 16);
                          setFirmware((prev) => prev.map((x) => x.id === entry.id ? { ...x, offset: Number.isFinite(parsed) ? parsed : 0 } : x));
                        }}
                        className="field field-sm w-20 font-mono"
                      />
                      <button type="button" onClick={() => setFirmware((prev) => prev.filter((x) => x.id !== entry.id))}
                        className="rounded p-1 text-slate-500 hover:text-rose-300">
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Image */}
            <div>
              <label className="label mb-2 block">Cover image</label>
              <input ref={imgInput} type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => imgInput.current?.click()} className="btn-ghost btn-sm">
                  <ImageIcon size={13} /> {image ? 'Change' : 'Choose image'}
                </button>
                {image && <span className="truncate text-xs text-slate-400">{image.name}</span>}
                {image && <button type="button" onClick={() => setImage(null)} className="text-slate-500 hover:text-rose-300"><X size={13} /></button>}
              </div>
              <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="field mt-2" placeholder="…or paste an image URL" />
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

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
              <input type="checkbox" checked={form.eraseAll} onChange={(e) => setForm({ ...form, eraseAll: e.target.checked })} className="h-3.5 w-3.5 accent-cyan-400" />
              <span className="text-xs text-slate-300">Recommend a full erase before installing</span>
            </label>

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
              {busy ? 'Uploading…' : 'Publish project'}
            </button>
          </form>
        </Panel>

        {/* Existing projects */}
        <Panel className="lg:sticky lg:top-6 lg:self-start">
          <PanelHeader icon={Database} title="Published" subtitle={`${projects.length} project(s)`} accent="lime" />
          {projects.length === 0 ? (
            <EmptyState icon={CloudUpload} title="Nothing published yet" description="Projects you publish appear here and on the flasher home page." />
          ) : (
            <ul className="scroll-thin max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto px-5 py-4">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-700">
                    {project.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-slate-600"><FileCode2 size={15} /></span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-100">{project.name}</p>
                    <p className="truncate font-mono text-[10px] text-slate-500">
                      {project.id} · v{project.version} · {project.firmware?.files?.length || 0} part(s)
                    </p>
                  </div>
                  <button onClick={() => remove(project.id)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </main>
  );
}
