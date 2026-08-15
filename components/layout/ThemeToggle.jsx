'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';

const MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export const STORAGE_KEY = 'te-flasher:theme';

/** Light is the default; dark is opt-in and remembered per browser. */
export function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export default function ThemeToggle({ compact = false }) {
  const [mode, setMode] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    setMode(saved);
    applyTheme(saved);
    setReady(true);
  }, []);

  const choose = (next) => {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  // Stable placeholder until the stored choice is known, so the server and
  // first client render agree.
  if (!ready) return <div className={compact ? 'h-8 w-8' : 'h-8 w-[4.25rem]'} aria-hidden />;

  if (compact) {
    return (
      <button
        onClick={() => choose(mode === 'dark' ? 'light' : 'dark')}
        title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
        aria-label="Toggle theme"
        className="rounded-lg border border-hairline bg-surface p-2 text-ink-500 transition-colors hover:border-brand-200 hover:text-brand-600"
      >
        {mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
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
            mode === m.id ? 'bg-surface text-brand-600 shadow-card' : 'text-ink-400 hover:text-ink-700'
          )}
        >
          <m.icon size={14} />
        </button>
      ))}
    </div>
  );
}
