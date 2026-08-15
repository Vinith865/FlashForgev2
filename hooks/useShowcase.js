'use client';

import { useEffect, useState } from 'react';
import { fetchShowcase } from '@/services/api';

export function useShowcase() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchShowcase()
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => {}); // the carousel is decoration — never block the page
    return () => { cancelled = true; };
  }, []);

  return items;
}
