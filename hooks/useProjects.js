'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchProjects } from '@/services/api';

export function useProjects() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ categories: [], boards: [], total: 0, totalAll: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [board, setBoard] = useState('all');
  const [sort, setSort] = useState('newest');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data, meta: m } = await fetchProjects({ limit: 100 });
      setItems(data);
      setMeta(m);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtering runs client-side so typing feels instant.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (board !== 'all' && !(p.supportedBoards || []).includes(board)) return false;
      if (!q) return true;
      return [p.name, p.description, p.category, ...(p.tags || []), ...(p.supportedBoards || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return list;
  }, [items, search, category, board, sort]);

  return {
    items,
    filtered,
    meta,
    loading,
    error,
    reload: load,
    search,
    setSearch,
    category,
    setCategory,
    board,
    setBoard,
    sort,
    setSort,
  };
}
