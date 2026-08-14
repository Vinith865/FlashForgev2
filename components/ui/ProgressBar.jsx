import clsx from 'clsx';

export default function ProgressBar({ value = 0, label, active = false, tone = 'cyan' }) {
  const pct = Math.min(100, Math.max(0, value));
  const gradient =
    tone === 'lime'
      ? 'linear-gradient(90deg,#a3e635,#22d3ee)'
      : 'linear-gradient(90deg,#22d3ee,#a78bfa)';

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs font-medium text-slate-400">{label || 'Idle'}</span>
        <span className="font-mono text-xs tabular-nums text-slate-300">{pct}%</span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="relative h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, backgroundImage: gradient }}
        >
          {active && (
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-y-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </span>
          )}
        </div>
        <div
          className={clsx('pointer-events-none absolute inset-0 rounded-full transition-opacity', active ? 'opacity-100' : 'opacity-0')}
          style={{ boxShadow: '0 0 22px 2px rgba(34,211,238,0.35) inset' }}
        />
      </div>
    </div>
  );
}
