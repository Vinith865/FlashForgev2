import clsx from 'clsx';
import { STATUS } from '@/hooks/useFlasher';

const MAP = {
  [STATUS.IDLE]:       { label: 'Disconnected', dot: 'bg-slate-500',    ring: 'border-white/10 text-slate-400' },
  [STATUS.CONNECTING]: { label: 'Connecting',   dot: 'bg-neon-amber',   ring: 'border-neon-amber/30 text-neon-amber', pulse: true },
  [STATUS.READY]:      { label: 'Ready',        dot: 'bg-neon-cyan',    ring: 'border-neon-cyan/30 text-neon-cyan' },
  [STATUS.FLASHING]:   { label: 'Flashing',     dot: 'bg-neon-violet',  ring: 'border-neon-violet/30 text-neon-violet', pulse: true },
  [STATUS.MONITORING]: { label: 'Monitoring',   dot: 'bg-neon-lime',    ring: 'border-neon-lime/30 text-neon-lime', pulse: true },
  [STATUS.DONE]:       { label: 'Flashed',      dot: 'bg-neon-lime',    ring: 'border-neon-lime/30 text-neon-lime' },
  [STATUS.ERROR]:      { label: 'Error',        dot: 'bg-neon-rose',    ring: 'border-neon-rose/30 text-neon-rose' },
};

export default function StatusPill({ status, className }) {
  const s = MAP[status] || MAP[STATUS.IDLE];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border bg-white/[0.03] px-3 py-1.5 text-xs font-semibold backdrop-blur',
        s.ring,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {s.pulse && (
          <span className={clsx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-70', s.dot)} />
        )}
        <span className={clsx('relative inline-flex h-2 w-2 rounded-full', s.dot)} />
      </span>
      {s.label}
    </span>
  );
}
