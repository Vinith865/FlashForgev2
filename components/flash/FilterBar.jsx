'use client';

import clsx from 'clsx';
import { Search, X } from 'lucide-react';

const QUICK = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'esp', label: 'ESP32' },
  { id: 'arduino', label: 'Arduino' },
];

export default function FilterBar({
  search, setSearch,
  category, setCategory,
  board, setBoard,
  sort, setSort,
  categories = [], boards = [],
  quick, setQuick,
  count, total,
}) {
  return (
    <div className="space-y-3 border-b border-hairline p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="field pl-10 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select value={board} onChange={(e) => setBoard(e.target.value)} className="field w-auto">
          <option value="all">All boards</option>
          {boards.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="field w-auto">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} className="field w-auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">A → Z</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <button
            key={q.id}
            onClick={() => setQuick(q.id)}
            className={quick === q.id ? 'chip-solid' : 'chip'}
          >
            {q.label}
          </button>
        ))}
        <span className={clsx('ml-auto font-mono text-[11px]', count === 0 ? 'text-ink-400' : 'text-ink-500')}>
          {count} of {total}
        </span>
      </div>
    </div>
  );
}
