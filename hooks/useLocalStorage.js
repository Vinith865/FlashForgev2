'use client';

import { useCallback, useEffect, useState } from 'react';

/** SSR-safe localStorage state. Always starts at `initial` so hydration matches. */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      /* corrupt or blocked storage — fall back to the default */
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {}
        return resolved;
      });
    },
    [key]
  );

  return [value, update, hydrated];
}
