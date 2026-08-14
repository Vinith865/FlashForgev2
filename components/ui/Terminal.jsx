'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowDownToLine, Copy, Check, Trash2, Pause, Play } from 'lucide-react';

const TONE = {
  info: 'text-slate-300',
  dim: 'text-slate-500',
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  error: 'text-rose-300',
  bold: 'text-cyan-200 font-semibold',
};

export default function Terminal({ lines = [], onClear, emptyHint = 'Waiting for output…', className, height = 'h-[22rem]' }) {
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

  return (
    <div className={clsx('relative overflow-hidden rounded-xl border border-white/10 bg-[#06080D]', className)}>
      {/* toolbar */}
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 font-mono text-[11px] text-slate-500">{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
          >
            {autoScroll ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button onClick={copy} title="Copy" className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          {onClear && (
            <button onClick={onClear} title="Clear" className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-rose-300">
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
          <p className="terminal-line text-slate-600">{emptyHint}</p>
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
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-700/90 px-3 py-1.5 text-[11px] font-medium text-slate-200 backdrop-blur transition hover:border-neon-cyan/40"
        >
          <ArrowDownToLine size={12} /> Jump to latest
        </button>
      )}
    </div>
  );
}
