'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Check, Copy, Github, Zap } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import QrCode from '@/components/ui/QrCode';

export default function ProjectDetail({ project, open, onClose, onFlash }) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!project || typeof window === 'undefined') return;
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setShareUrl(`${base}/?project=${encodeURIComponent(project.id)}`);
  }, [project]);

  if (!project) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project.name}
      subtitle={`v${project.version} · ${project.category}`}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { onFlash(project); onClose(); }} className="btn-primary btn-sm">
            <Zap size={13} /> Select &amp; flash
          </button>
          {project.docsUrl && (
            <a href={project.docsUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              <BookOpen size={13} /> Docs
            </a>
          )}
          {project.sourceUrl && (
            <a href={project.sourceUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              <Github size={13} /> Source
            </a>
          )}
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          {project.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.thumbnailUrl} alt="" className="h-40 w-full rounded-xl border border-hairline object-cover" />
          )}

          <p className="text-sm leading-relaxed text-ink-700">
            {project.longDescription || project.description}
          </p>

          <div>
            <p className="label mb-2">Supported boards</p>
            <div className="flex flex-wrap gap-1.5">
              {(project.supportedBoards || []).map((b) => (
                <span key={b} className="chip-tag">{b}</span>
              ))}
            </div>
          </div>

          {project.tags?.length > 0 && (
            <div>
              <p className="label mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
            </div>
          )}

          <div>
            <p className="label mb-2">Flash layout</p>
            <div className="overflow-hidden rounded-xl border border-hairline">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Offset</th>
                    <th className="px-3 py-2 font-medium">File</th>
                    <th className="px-3 py-2 text-right font-medium">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {(project.firmware?.files || []).map((f, i) => (
                    <tr key={i} className="text-ink-700">
                      <td className="px-3 py-2 font-mono text-brand-600">
                        0x{Number(f.offset).toString(16).padStart(5, '0')}
                      </td>
                      <td className="truncate px-3 py-2 font-mono">{f.filename || f.path.split('/').pop()}</td>
                      <td className="px-3 py-2 text-right font-mono text-ink-500">
                        {f.size ? `${(f.size / 1024).toFixed(1)} KB` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono text-[10px] text-ink-500">
              mode {project.firmware?.flashMode} · freq {project.firmware?.flashFreq} · size {project.firmware?.flashSize}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:w-48">
          <p className="label">Share</p>
          <QrCode value={shareUrl || 'https://example.com'} size={150} />
          <button onClick={copy} className="btn-ghost btn-sm w-full">
            {copied ? <><Check size={12} className="text-emerald-600" /> Copied</> : <><Copy size={12} /> Copy link</>}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-ink-500">
            Scan to open this project directly on another machine.
          </p>
        </div>
      </div>
    </Modal>
  );
}
