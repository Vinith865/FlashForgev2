'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowDownToLine, Check, Copy, Pause, Play, Trash2 } from 'lucide-react';

/**
 * The console stays dark on a light interface, on purpose: coloured severity
 * levels are far easier to scan against a dark ground, and it reads as a
 * distinct "machine output" block rather than more chrome.
 */
const TONE = {
  info: 'text-console-text',
  dim: 'text-console-dim',
  success: 'text-console-ok',
  warning: 'text-console-warn',
  error: 'text-console-err',
  bold: 'text-console-info font-semibold',
};

export default function Terminal({
  lines = [],
  onClear,
  emptyHint = 'Waiting for output…',
  className,
  height = 'h-[22rem]',
}) {
  const scrollRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, autoScroll]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.map((l) => l.message ?? l.text ?? '').join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const iconBtn =
    'rounded-md p-1.5 text-console-dim transition hover:bg-white/10 hover:text-console-text';

  return (
    <div className={clsx('relative overflow-hidden rounded-xl bg-console-bg', className)}>
      <div className="flex items-center justify-between border-b border-console-border px-3 py-2">
        <span className="font-mono text-[11px] text-console-dim">{lines.length} lines</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            className={iconBtn}
          >
            {autoScroll ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button onClick={copy} title="Copy" className={iconBtn}>
            {copied ? <Check size={13} className="text-console-ok" /> : <Copy size={13} />}
          </button>
          {onClear && (
            <button onClick={onClear} title="Clear" className={iconBtn}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          if (atBottom !== autoScroll) setAutoScroll(atBottom);
        }}
        className={clsx('scroll-thin overflow-y-auto px-4 py-3', height)}
      >
        {lines.length === 0 ? (
          <p className="terminal-line text-console-dim">{emptyHint}</p>
        ) : (
          lines.map((line) => (
            <div key={line.id} className={clsx('terminal-line', TONE[line.level] || TONE.info)}>
              {line.message ?? line.text}
            </div>
          ))
        )}
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-btn"
        >
          <ArrowDownToLine size={12} /> Jump to latest
        </button>
      )}
    </div>
  );
}
