'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const KEY = 'flasher:history:v2';
const MAX = 40;

export function useFlashHistory() {
  const [history, setHistory, hydrated] = useLocalStorage(KEY, []);

  const record = useCallback(
    (entry) => {
      setHistory((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: new Date().toISOString(),
            ...entry,
          },
          ...prev,
        ].slice(0, MAX)
      );
    },
    [setHistory]
  );

  const clear = useCallback(() => setHistory([]), [setHistory]);

  const stats = {
    total: history.length,
    success: history.filter((h) => h.status === 'success').length,
    failed: history.filter((h) => h.status === 'error').length,
    bytes: history.reduce((sum, h) => sum + (h.bytes || 0), 0),
  };

  return { history, record, clear, stats, hydrated };
}
