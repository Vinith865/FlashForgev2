'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import ProgressBar from '@/components/ui/ProgressBar';
import { STATUS } from '@/hooks/useFlasher';

const STAGES = [
  { key: 'download', label: 'Fetching firmware', upTo: 20 },
  { key: 'connect', label: 'Syncing with bootloader', upTo: 39 },
  { key: 'write', label: 'Writing flash', upTo: 96 },
  { key: 'reset', label: 'Resetting board', upTo: 100 },
];

const formatBytes = (b) => {
  if (!b) return '—';
  const units = ['B', 'KB', 'MB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

function Elapsed({ running, resetKey }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    if (!running) return undefined;
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(id);
  }, [running, resetKey]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return <span className="nums">{mm}:{ss}</span>;
}

export default function FlashProgress({ status, progress, label, lastResult, onReset }) {
  const flashing = status === STATUS.FLASHING;
  const done = status === STATUS.DONE;
  const failed = status === STATUS.ERROR;

  if (done) {
    return (
      <div className="rounded-xl tint-ok p-4 text-center animate-slideUp">
        <span className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-ok-fg text-white">
          <CheckCircle2 size={22} />
        </span>
        <p className="text-sm font-semibold text-ok-fg">Flash complete</p>
        <p className="mt-1 text-xs text-ok-fg">
          {lastResult?.bytes ? `${formatBytes(lastResult.bytes)} written` : 'Firmware written'}
          {lastResult?.durationMs ? ` in ${(lastResult.durationMs / 1000).toFixed(1)}s` : ''}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-ok-fg">
          Open the Monitor tab to watch it boot. If nothing happens, tap RESET on the board.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl tint-danger p-4 animate-slideUp">
        <div className="flex items-start gap-2.5">
          <XCircle size={18} className="mt-0.5 shrink-0 text-danger-fg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-danger-fg">Flash didn&apos;t complete</p>
            <p className="mt-1 text-xs leading-relaxed text-danger-fg">
              Check the Console tab for the reason. Most failures are the board not being in
              download mode — hold BOOT, tap RESET, release BOOT, then try again.
            </p>
            <button onClick={onReset} className="btn-ghost btn-sm mt-2.5">
              <RotateCcw size={12} /> Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeStage = STAGES.find((s) => progress <= s.upTo) || STAGES[STAGES.length - 1];

  return (
    <div className="space-y-3">
      <ProgressBar value={progress} label={label || 'Ready to flash'} active={flashing} />

      {flashing && (
        <>
          <ol className="space-y-1.5">
            {STAGES.map((stage) => {
              const complete = progress > stage.upTo;
              const current = stage.key === activeStage.key;
              return (
                <li key={stage.key} className="flex items-center gap-2 text-xs">
                  {complete ? (
                    <CheckCircle2 size={13} className="shrink-0 text-ok-fg" />
                  ) : current ? (
                    <Loader2 size={13} className="shrink-0 animate-spin text-brand-600" />
                  ) : (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" style={{ margin: '0 5.5px' }} />
                  )}
                  <span
                    className={clsx(
                      'truncate',
                      complete ? 'text-ink-500 line-through decoration-ink-400/40' : current ? 'font-medium text-ink-900' : 'text-ink-500'
                    )}
                  >
                    {stage.label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 font-mono text-[11px] text-ink-500">
            <span>elapsed <Elapsed running={flashing} resetKey={status} /></span>
            <span>do not unplug</span>
          </div>
        </>
      )}
    </div>
  );
}
