'use client';

import clsx from 'clsx';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export default function FilterBar({
  search, setSearch,
  category, setCategory,
  board, setBoard,
  sort, setSort,
  categories = [], boards = [],
  count, total,
}) {
  const hasFilters = search || category !== 'all' || board !== 'all';

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects, boards, tags…"
          className="field pl-10 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-slate-200"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="field field-sm w-auto">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={board} onChange={(e) => setBoard(e.target.value)} className="field field-sm w-auto">
          <option value="all">All boards</option>
          {boards.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} className="field field-sm w-auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">A → Z</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setCategory('all'); setBoard('all'); }}
            className="chip"
          >
            <SlidersHorizontal size={11} /> Reset
          </button>
        )}

        <span className={clsx('ml-auto font-mono text-[11px]', count === 0 ? 'text-slate-600' : 'text-slate-500')}>
          {count}/{total}
        </span>
      </div>
    </div>
  );
}
