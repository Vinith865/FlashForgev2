export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          <Icon size={22} />
        </span>
      )}
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {description && <p className="max-w-sm text-xs leading-relaxed text-ink-500">{description}</p>}
      {action}
    </div>
  );
}
