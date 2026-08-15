'use client';

import clsx from 'clsx';
import { ArrowUpRight, Star } from 'lucide-react';
import BoardArt from './BoardArt';

export default function ProjectCard({ project, selected, favorite, onSelect, onToggleFavorite, onOpenDetail }) {
  const boards = project.supportedBoards || [];

  return (
    <article
      onClick={() => onSelect(project)}
      className={clsx(
        'group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ease-smooth',
        selected
          ? 'border-brand-500 bg-brand-50/50 shadow-lift ring-1 ring-brand-500/25'
          : 'border-hairline bg-surface shadow-card hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift'
      )}
    >
      {/* Cover: a fixed 16:9 frame, so any upload keeps its proportions
          instead of being squeezed into a square. */}
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-hairline bg-canvas">
        {project.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <BoardArt chip={boards[0]} size={72} />
          </span>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.id); }}
          className={clsx(
            'absolute right-2 top-2 rounded-lg bg-surface/90 p-1.5 backdrop-blur transition',
            favorite ? 'text-brand-600' : 'text-ink-400 hover:text-brand-500'
          )}
          title={favorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-3.5">
        <h3 className="truncate text-sm font-semibold tracking-tight text-ink-900">{project.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">{project.description}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {boards.slice(0, 2).map((b) => (
            <span key={b} className="chip-tag">{b}</span>
          ))}
          <span className="chip-tag bg-muted text-ink-500">v{project.version}</span>
          {boards.length > 2 && <span className="text-[10px] text-ink-500">+{boards.length - 2}</span>}

          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail(project); }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium text-ink-500 opacity-0 transition-all group-hover:opacity-100 hover:text-brand-600"
          >
            Details <ArrowUpRight size={10} />
          </button>
        </div>
      </div>
    </article>
  );
}
