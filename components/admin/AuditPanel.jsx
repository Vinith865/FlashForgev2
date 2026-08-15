'use client';

import clsx from 'clsx';
import {
  AlertTriangle, FilePlus2, FileX2, LogIn, Pencil, ShieldOff, Trash2, Upload,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

const ICONS = {
  'auth.login': LogIn,
  'project.create': FilePlus2,
  'project.replace': Upload,
  'project.update': Pencil,
  'project.delete': Trash2,
  'file.add': FilePlus2,
  'file.delete': FileX2,
  'file.offset': Pencil,
  'sessions.revoked': ShieldOff,
  'sessions.revoke_all': ShieldOff,
};

const TONE = {
  'project.delete': 'text-danger-fg',
  'file.delete': 'text-danger-fg',
  'sessions.revoked': 'text-warn-fg',
  'sessions.revoke_all': 'text-warn-fg',
  'auth.login': 'text-ok-fg',
};

export default function AuditPanel({ data }) {
  const entries = data?.audit || [];
  const failures = (data?.failures || []).filter((f) => !f.cleared);

  return (
    <div className="space-y-4 px-5 py-4">
      {failures.length > 0 && (
        <div className="rounded-xl tint-warn p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-warn-fg">
            <AlertTriangle size={13} /> Recent failed sign-ins
          </p>
          <ul className="space-y-1">
            {failures.slice(0, 5).map((f, i) => (
              <li key={i} className="font-mono text-[10px] text-warn-fg">
                {new Date(f.at).toLocaleString()} · {f.ip} · {f.username || '—'} · {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={LogIn}
          title="No activity recorded yet"
          description="Sign-ins, publishes, edits and deletions all appear here."
        />
      ) : (
        <ul className="scroll-thin max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
          {entries.map((entry, i) => {
            const Icon = ICONS[entry.action] || Pencil;
            return (
              <li key={`${entry.at}-${i}`} className="row-hover flex items-start gap-2.5 rounded-lg border border-hairline bg-surface px-3 py-2">
                <Icon size={14} className={clsx('mt-0.5 shrink-0', TONE[entry.action] || 'text-ink-400')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-ink-900">
                    <span className="font-mono text-[11px] text-brand-600">{entry.action}</span>
                    {entry.detail ? ` · ${entry.detail}` : ''}
                  </p>
                  <p className="truncate font-mono text-[10px] text-ink-500">
                    {new Date(entry.at).toLocaleString()} · {entry.actor}
                    {entry.ip ? ` · ${entry.ip}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
