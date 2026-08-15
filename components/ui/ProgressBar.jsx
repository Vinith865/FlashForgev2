export default function ProgressBar({ value = 0, label, active = false }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-ink-700">{label || 'Idle'}</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-brand-600">{pct}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-hairline">
        <div
          className="relative h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        >
          {active && (
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-y-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
