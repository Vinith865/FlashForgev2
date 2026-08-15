import clsx from 'clsx';
import { STATUS } from '@/hooks/useFlasher';

const MAP = {
  [STATUS.IDLE]:       { label: 'Disconnected', dot: 'bg-ink-400',    box: 'bg-muted text-ink-500' },
  [STATUS.CONNECTING]: { label: 'Connecting',   dot: 'bg-warn-bg0',  box: 'bg-warn-bg text-warn-fg', pulse: true },
  [STATUS.READY]:      { label: 'Connected',    dot: 'bg-ok-fg', box: 'tint-ok' },
  [STATUS.FLASHING]:   { label: 'Flashing',     dot: 'bg-brand-600',  box: 'bg-brand-50 text-brand-600', pulse: true },
  [STATUS.MONITORING]: { label: 'Monitoring',   dot: 'bg-ok-fg', box: 'tint-ok', pulse: true },
  [STATUS.DONE]:       { label: 'Flashed',      dot: 'bg-ok-fg', box: 'tint-ok' },
  [STATUS.ERROR]:      { label: 'Error',        dot: 'bg-danger-bg0',    box: 'tint-danger' },
};

export default function StatusPill({ status, className }) {
  const s = MAP[status] || MAP[STATUS.IDLE];
  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold', s.box, className)}>
      <span className="relative flex h-2 w-2">
        {s.pulse && <span className={clsx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-70', s.dot)} />}
        <span className={clsx('relative inline-flex h-2 w-2 rounded-full', s.dot)} />
      </span>
      {s.label}
    </span>
  );
}
