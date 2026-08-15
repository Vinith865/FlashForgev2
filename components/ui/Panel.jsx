import clsx from 'clsx';

export default function Panel({ className, children, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={clsx('card overflow-hidden', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-btn">
            <Icon size={19} strokeWidth={2.1} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-ink-900">{title}</h2>
          {subtitle && <p className="truncate text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
