'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Monitor, Moon, Sun } from 'lucide-react';

const MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export const STORAGE_KEY = 'te-flasher:theme';

export function applyTheme(mode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export default function ThemeToggle({ compact = false }) {
  const [mode, setMode] = useState('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) || 'system';
    setMode(saved);
    applyTheme(saved);
    setReady(true);

    // Follow the OS while in system mode.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if ((window.localStorage.getItem(STORAGE_KEY) || 'system') === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const choose = (next) => {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  // Render a stable placeholder until we know the stored mode, so the
  // markup matches on first paint.
  if (!ready) return <div className={compact ? 'h-8 w-8' : 'h-8 w-[6.5rem]'} aria-hidden />;

  if (compact) {
    const isDark = document.documentElement.classList.contains('dark');
    return (
      <button
        onClick={() => choose(isDark ? 'light' : 'dark')}
        title={isDark ? 'Switch to light' : 'Switch to dark'}
        aria-label="Toggle theme"
        className="rounded-lg border border-hairline bg-surface p-2 text-ink-500 transition-colors hover:border-brand-200 hover:text-brand-600"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-lg border border-hairline bg-canvas p-0.5"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          role="radio"
          aria-checked={mode === m.id}
          onClick={() => choose(m.id)}
          title={m.label}
          className={clsx(
            'grid h-7 w-7 place-items-center rounded-md transition-all duration-200',
            mode === m.id
              ? 'bg-surface text-brand-600 shadow-card'
              : 'text-ink-400 hover:text-ink-700'
          )}
        >
          <m.icon size={14} />
        </button>
      ))}
    </div>
  );
}
