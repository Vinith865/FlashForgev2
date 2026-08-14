import clsx from 'clsx';

export default function Panel({ className, children, edge = true, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={clsx('glass', edge && 'edge-light', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({ icon: Icon, title, subtitle, actions, accent = 'cyan' }) {
  const tone = {
    cyan: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/25',
    violet: 'text-neon-violet bg-neon-violet/10 border-neon-violet/25',
    lime: 'text-neon-lime bg-neon-lime/10 border-neon-lime/25',
    amber: 'text-neon-amber bg-neon-amber/10 border-neon-amber/25',
  }[accent];

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', tone)}>
            <Icon size={17} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
