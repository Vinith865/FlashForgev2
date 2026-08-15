'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowLeft, CloudUpload, Database, Eye, EyeOff, FileCode2, LogOut,
  Pencil, ScrollText, ShieldCheck, ShieldOff, Trash2, X,
} from 'lucide-react';

import Panel, { PanelHeader } from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import LoginScreen from './LoginScreen';
import ProjectForm, { BLANK } from './ProjectForm';
import FileManager from './FileManager';
import AuditPanel from './AuditPanel';
import { BLOB_TOKEN_HINT, buildUploadPayload, slugOf } from './upload';
import {
  adminAddFiles, adminAudit, adminDeleteFile, adminDeleteProject, adminListProjects,
  adminLogin, adminLoginConfig, adminRevokeSessions, adminSaveProject,
  adminSetFileOffset, adminUpdateProject, fetchHealth,
} from '@/services/api';

const TOKEN_KEY = 'flasher:admin-token';

export default function AdminConsole() {
  const [token, setToken] = useState('');
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState(null);
  const [projects, setProjects] = useState([]);
  const [auditData, setAuditData] = useState(null);

  const [form, setForm] = useState(BLANK);
  const [firmware, setFirmware] = useState([]);
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const [tab, setTab] = useState('projects');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState(null);

  const flash = (type, text, extra = {}) => {
    setNotice({ type, text, ...extra });
    if (type !== 'error') setTimeout(() => setNotice(null), 5000);
  };

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => {});
    adminLoginConfig().then(setConfig).catch(() => {});
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const signOut = useCallback((message) => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setProjects([]);
    setAuditData(null);
    if (message) flash('error', message);
  }, []);

  const refresh = useCallback(async (activeToken) => {
    try {
      setProjects(await adminListProjects(activeToken));
      setAuditData(await adminAudit(activeToken));
    } catch (err) {
      if (err.status === 401) signOut('Your session ended. Sign in again.');
      else flash('error', err.message);
    }
  }, [signOut]);

  useEffect(() => {
    if (token) refresh(token);
  }, [token, refresh]);

  /* ── Auth ─────────────────────────────────────────────────────────── */

  const login = async ({ username, password, totp }) => {
    setBusy(true);
    setNotice(null);
    try {
      const { token: t } = await adminLogin(username, password, totp);
      window.localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    } catch (err) {
      flash('error', err.message, { totpRequired: Boolean(err.data?.totpRequired) });
    } finally {
      setBusy(false);
    }
  };

  const revokeSessions = async () => {
    if (!window.confirm('Sign out every device, including this one?')) return;
    try {
      await adminRevokeSessions(token);
      signOut('All sessions revoked. Sign in again.');
    } catch (err) {
      flash('error', err.message);
    }
  };

  /* ── Projects ─────────────────────────────────────────────────────── */

  const resetForm = () => {
    setForm(BLANK);
    setFirmware([]);
    setImage(null);
    setEditing(null);
    setProgress(0);
  };

  const startEdit = (project) => {
    setEditing(project.id);
    setExpanded(project.id);
    setForm({
      name: project.name,
      description: project.description || '',
      longDescription: project.longDescription || '',
      version: project.version || '1.0.0',
      category: project.category || 'Student Projects',
      supportedBoards: project.supportedBoards || ['ESP32'],
      tags: (project.tags || []).join(', '),
      flashMode: project.firmware?.flashMode || 'dio',
      flashFreq: project.firmware?.flashFreq || '40m',
      flashSize: project.firmware?.flashSize || 'keep',
      eraseAll: Boolean(project.firmware?.eraseAll),
      docsUrl: project.docsUrl || '',
      sourceUrl: project.sourceUrl || '',
      imageUrl: project.thumbnailUrl || '',
      draft: Boolean(project.draft),
    });
    setFirmware([]);
    setImage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return flash('error', 'Give the project a name.');
    if (!form.supportedBoards.length) return flash('error', 'Select at least one board.');
    if (!editing && !firmware.length) return flash('error', 'Attach at least one firmware file.');
    if (!editing && health?.storage === 'vercel-blob' && health?.blob?.clientUploads === false) {
      return flash('error', BLOB_TOKEN_HINT);
    }

    setBusy(true);
    setProgress(0);
    try {
      if (editing) {
        await adminUpdateProject(token, editing, {
          ...form,
          thumbnailUrl: form.imageUrl,
          supportedBoards: form.supportedBoards,
        });
        flash('success', `Updated “${form.name}”.`);
      } else {
        const payload = await buildUploadPayload({
          entries: firmware,
          image,
          slug: slugOf(form.name),
          token,
          useBlob: health?.storage === 'vercel-blob',
          onProgress: setProgress,
        });
        const saved = await adminSaveProject(token, { ...form, ...payload });
        flash('success', `Published “${saved.name}”${saved.draft ? ' as a draft' : ''}.`);
      }
      resetForm();
      refresh(token);
    } catch (err) {
      if (err.status === 401) signOut('Your session ended. Sign in again.');
      else flash('error', err.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const toggleDraft = async (project) => {
    try {
      await adminUpdateProject(token, project.id, { draft: !project.draft });
      flash('success', project.draft ? `“${project.name}” is now live.` : `“${project.name}” moved to drafts.`);
      refresh(token);
    } catch (err) {
      flash('error', err.message);
    }
  };

  const remove = async (project) => {
    if (!window.confirm(`Delete “${project.name}” and all of its firmware files?`)) return;
    try {
      await adminDeleteProject(token, project.id);
      if (editing === project.id) resetForm();
      flash('success', 'Project deleted.');
      refresh(token);
    } catch (err) {
      flash('error', err.message);
    }
  };

  /* ── Files ────────────────────────────────────────────────────────── */

  const addFiles = async (projectId, entries) => {
    setBusy(true);
    try {
      const payload = await buildUploadPayload({
        entries,
        slug: projectId,
        token,
        useBlob: health?.storage === 'vercel-blob',
      });
      await adminAddFiles(token, projectId, payload);
      flash('success', `Added ${entries.length} file(s).`);
      refresh(token);
    } catch (err) {
      flash('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const setOffset = async (projectId, filename, offset) => {
    try {
      await adminSetFileOffset(token, projectId, filename, offset);
      flash('success', `${filename} → 0x${offset.toString(16)}`);
      refresh(token);
    } catch (err) {
      flash('error', err.message);
    }
  };

  const removeFile = async (projectId, filename) => {
    if (!window.confirm(`Remove ${filename} from this project?`)) return;
    try {
      await adminDeleteFile(token, projectId, filename);
      flash('success', `${filename} removed.`);
      refresh(token);
    } catch (err) {
      flash('error', err.message);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────── */

  if (!token) {
    return <LoginScreen onSubmit={login} config={config} busy={busy} notice={notice} />;
  }

  const drafts = projects.filter((p) => p.draft).length;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-tightest text-ink-900">Admin console</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Database size={12} /> {health?.storage || '…'}
            </span>
            <span className={clsx('inline-flex items-center gap-1.5', health?.twoFactorEnabled ? 'text-emerald-600' : 'text-amber-600')}>
              {health?.twoFactorEnabled ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
              {health?.twoFactorEnabled ? '2FA active' : '2FA off'}
            </span>
            {health?.storage === 'local-filesystem' && (
              <span className="text-amber-600">not persisted on Vercel</span>
            )}
            {health?.storage === 'unconfigured' && (
              <span className="text-red-600">no Blob store connected</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn-ghost btn-sm"><ArrowLeft size={13} /> Flasher</Link>
          <button onClick={revokeSessions} className="btn-ghost btn-sm" title="Invalidate every token">
            <ShieldOff size={13} /> Revoke all
          </button>
          <button onClick={() => signOut()} className="btn-ghost btn-sm"><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      {health?.storage === 'vercel-blob' && health?.blob?.clientUploads === false && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">Uploads are disabled.</strong> {BLOB_TOKEN_HINT}
        </div>
      )}

      {notice && (
        <div className={clsx(
          'mb-5 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-xs animate-slideUp',
          notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        )}>
          <span className="leading-relaxed">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="shrink-0 opacity-60 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel>
          <PanelHeader
            icon={editing ? Pencil : CloudUpload}
            title={editing ? `Editing “${form.name}”` : 'Publish firmware'}
            subtitle={editing ? 'Metadata only — manage files on the right' : 'Files stream straight to storage'}
          />
          <ProjectForm
            form={form} setForm={setForm}
            firmware={firmware} setFirmware={setFirmware}
            image={image} setImage={setImage}
            editing={Boolean(editing)}
            busy={busy}
            progress={progress}
            onSubmit={submit}
            onCancelEdit={resetForm}
          />
        </Panel>

        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Panel>
            <div className="flex items-center gap-1 border-b border-hairline px-5">
              {[
                { id: 'projects', label: 'Projects', icon: Database, badge: projects.length },
                { id: 'audit', label: 'Activity', icon: ScrollText, badge: auditData?.audit?.length },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx('tab inline-flex items-center gap-2', tab === t.id && 'tab-active')}
                >
                  <t.icon size={13} /> {t.label}
                  {t.badge > 0 && <span className="rounded-full bg-brand-50 px-1.5 text-[10px] text-brand-600">{t.badge}</span>}
                </button>
              ))}
              {drafts > 0 && tab === 'projects' && (
                <span className="ml-auto rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {drafts} draft
                </span>
              )}
            </div>

            {tab === 'audit' ? (
              <AuditPanel data={auditData} />
            ) : projects.length === 0 ? (
              <EmptyState icon={CloudUpload} title="Nothing published yet" description="Projects you publish appear here and on the flasher home page." />
            ) : (
              <ul className="scroll-thin max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto px-5 py-4">
                {projects.map((project) => (
                  <li key={project.id} className={clsx(
                    'rounded-xl border bg-surface p-3 transition-all duration-200 ease-smooth hover:shadow-card',
                    editing === project.id ? 'border-brand-500 bg-brand-50/50' : 'border-hairline'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-hairline bg-canvas">
                        {project.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-ink-400"><FileCode2 size={16} /></span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-900">
                          {project.name}
                          {project.draft && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">draft</span>
                          )}
                        </p>
                        <p className="truncate font-mono text-[11px] text-ink-500">
                          v{project.version} · {project.firmware?.files?.length || 0} file(s)
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button onClick={() => toggleDraft(project)} title={project.draft ? 'Publish' : 'Move to drafts'}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-slate-100 hover:text-ink-700">
                          {project.draft ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => startEdit(project)} title="Edit"
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => remove(project)} title="Delete"
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpanded(expanded === project.id ? null : project.id)}
                      className="mt-2 w-full rounded-lg border border-hairline py-1.5 text-[11px] font-medium text-ink-500 transition hover:border-brand-200 hover:text-brand-600"
                    >
                      {expanded === project.id ? 'Hide files' : 'Manage files'}
                    </button>

                    {expanded === project.id && (
                      <div className="mt-3 border-t border-hairline pt-3">
                        <FileManager
                          project={project}
                          busy={busy}
                          onAdd={(entries) => addFiles(project.id, entries)}
                          onSetOffset={(filename, offset) => setOffset(project.id, filename, offset)}
                          onRemove={(filename) => removeFile(project.id, filename)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
