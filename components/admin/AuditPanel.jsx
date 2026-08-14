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
  'project.delete': 'text-rose-300',
  'file.delete': 'text-rose-300',
  'sessions.revoked': 'text-amber-300',
  'sessions.revoke_all': 'text-amber-300',
  'auth.login': 'text-emerald-300',
};

export default function AuditPanel({ data }) {
  const entries = data?.audit || [];
  const failures = data?.failures || [];

  return (
    <div className="space-y-5 px-5 py-4">
      {failures.length > 0 && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200">
            <AlertTriangle size={13} /> Recent failed sign-ins
          </p>
          <ul className="space-y-1">
            {failures.slice(0, 5).map((f, i) => (
              <li key={i} className="font-mono text-[10px] text-amber-200/70">
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
              <li
                key={`${entry.at}-${i}`}
                className="flex items-start gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2"
              >
                <Icon size={13} className={clsx('mt-0.5 shrink-0', TONE[entry.action] || 'text-slate-500')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-200">
                    <span className="font-mono text-[11px] text-slate-400">{entry.action}</span>
                    {entry.detail ? ` · ${entry.detail}` : ''}
                  </p>
                  <p className="truncate font-mono text-[10px] text-slate-600">
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
