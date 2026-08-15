'use client';

import clsx from 'clsx';
import { ArrowUpRight, Cpu, Star } from 'lucide-react';

export default function ProjectCard({ project, selected, favorite, onSelect, onToggleFavorite, onOpenDetail }) {
  const boards = project.supportedBoards || [];

  return (
    <article
      onClick={() => onSelect(project)}
      className={clsx(
        'group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200',
        selected
          ? 'border-brand-500 bg-brand-50/60 shadow-card'
          : 'border-hairline bg-surface shadow-card hover:border-brand-200 hover:shadow-lift'
      )}
    >
      <div className="flex gap-3.5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline bg-canvas">
          {project.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-ink-400">
              <Cpu size={20} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-ink-900">{project.name}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.id); }}
              className={clsx('shrink-0 rounded-md p-1 transition', favorite ? 'text-brand-600' : 'text-ink-400 hover:text-brand-500')}
              title={favorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">{project.description}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {boards.slice(0, 2).map((b) => (
              <span key={b} className="chip-tag">{b}</span>
            ))}
            <span className="chip-tag bg-slate-100 text-ink-500">v{project.version}</span>
            {boards.length > 2 && <span className="text-[10px] text-ink-500">+{boards.length - 2}</span>}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onOpenDetail(project); }}
        className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2 py-1 text-[10px] font-medium text-ink-500 opacity-0 transition-all group-hover:opacity-100 hover:border-brand-200 hover:text-brand-600"
      >
        Details <ArrowUpRight size={10} />
      </button>
    </article>
  );
}
