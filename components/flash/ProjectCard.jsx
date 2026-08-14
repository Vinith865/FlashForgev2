'use client';

import clsx from 'clsx';
import { Star, Cpu, Layers, ArrowUpRight } from 'lucide-react';

export default function ProjectCard({ project, selected, favorite, onSelect, onToggleFavorite, onOpenDetail }) {
  const boards = project.supportedBoards || [];
  const parts = project.firmware?.files?.length || 0;

  return (
    <article
      onClick={() => onSelect(project)}
      className={clsx(
        'group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-300',
        selected
          ? 'border-neon-cyan/50 bg-neon-cyan/[0.07] shadow-glow'
          : 'border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]'
      )}
    >
      {selected && (
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
      )}

      <div className="flex gap-3.5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-ink-600 to-ink-800">
          {project.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-slate-600">
              <Cpu size={20} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-100">{project.name}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.id); }}
              className={clsx(
                'shrink-0 rounded-md p-1 transition',
                favorite ? 'text-neon-amber' : 'text-slate-600 hover:text-slate-300'
              )}
              title={favorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{project.description}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              v{project.version}
            </span>
            {boards.slice(0, 2).map((b) => (
              <span key={b} className="rounded-md border border-neon-cyan/20 bg-neon-cyan/[0.08] px-1.5 py-0.5 text-[10px] text-neon-cyan">
                {b}
              </span>
            ))}
            {boards.length > 2 && (
              <span className="text-[10px] text-slate-600">+{boards.length - 2}</span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-600">
              <Layers size={10} /> {parts}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onOpenDetail(project); }}
        className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-ink-800/80 px-2 py-1 text-[10px] font-medium text-slate-400 opacity-0 backdrop-blur transition-all group-hover:opacity-100 hover:border-neon-cyan/40 hover:text-neon-cyan"
      >
        Details <ArrowUpRight size={10} />
      </button>
    </article>
  );
}
