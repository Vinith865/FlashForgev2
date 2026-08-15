'use client';

import clsx from 'clsx';
import { CheckCircle2, Clock, Trash2, XCircle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

const formatBytes = (b) => {
  if (!b) return '—';
  const units = ['B', 'KB', 'MB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

const formatDuration = (ms) => (!ms ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

export default function HistoryPanel({ history, stats, onClear }) {
  if (!history.length) {
    return (
      <EmptyState
        icon={Clock}
        title="No flashes yet"
        description="Every flash you run is logged here — stored locally in your browser, never uploaded."
      />
    );
  }

  return (
    <div className="space-y-3 px-5 pb-5">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total', value: stats.total, tone: 'text-ink-900' },
          { label: 'Success', value: stats.success, tone: 'text-emerald-600' },
          { label: 'Failed', value: stats.failed, tone: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-center">
            <p className={clsx('font-mono text-lg font-semibold nums', s.tone)}>{s.value}</p>
            <p className="label mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <ul className="scroll-thin max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {history.map((h) => (
          <li key={h.id} className="row-hover flex items-center gap-2.5 rounded-lg border border-hairline bg-surface px-3 py-2">
            {h.status === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
            ) : (
              <XCircle size={15} className="shrink-0 text-red-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink-900">{h.project}</p>
              <p className="truncate font-mono text-[10px] text-ink-500">
                {new Date(h.at).toLocaleString()} · {h.chip || '—'} · {formatBytes(h.bytes)} · {formatDuration(h.durationMs)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <button onClick={onClear} className="btn-ghost btn-sm w-full">
        <Trash2 size={12} /> Clear history
      </button>
    </div>
  );
}
