'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

const INTERVAL_MS = 5000;

export default function Showcase({ items = [] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const count = items.length;
  const go = useCallback((next) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(timer.current);
  }, [count, paused]);

  if (!count) return null;
  const active = items[index];

  return (
    <div
      className="w-full max-w-[34rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
        <a
          href={active.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          title={active.title}
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-canvas">
            {items.map((item, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={item.imageUrl}
                alt={item.title}
                loading={i === 0 ? 'eager' : 'lazy'}
                className={clsx(
                  'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-smooth',
                  i === index ? 'opacity-100' : 'opacity-0'
                )}
              />
            ))}

            {/* Play affordance */}
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform duration-300 ease-smooth group-hover:scale-110">
                <Play size={22} fill="currentColor" />
              </span>
            </span>

            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10">
              <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                {active.title}
              </span>
            </span>
          </div>
        </a>

        {count > 1 && (
          <>
            <button
              onClick={() => go(index - 1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-1.5 text-ink-700 opacity-0 shadow-card backdrop-blur transition group-hover:opacity-100 hover:text-brand-600"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-1.5 text-ink-700 opacity-0 shadow-card backdrop-blur transition group-hover:opacity-100 hover:text-brand-600"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => go(i)}
              aria-label={`Show ${item.title}`}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300 ease-smooth',
                i === index ? 'w-5 bg-brand-600' : 'w-1.5 bg-ink-400/50 hover:bg-ink-400'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
