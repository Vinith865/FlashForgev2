'use client';

import clsx from 'clsx';
import { Check, Package, Usb, Zap } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Connect', hint: 'Plug in over USB', icon: Usb },
  { id: 2, label: 'Choose', hint: 'Pick firmware', icon: Package },
  { id: 3, label: 'Flash', hint: 'Write to the board', icon: Zap },
];

export default function StepIndicator({ current, connected = false, className }) {
  return (
    <ol className={clsx('flex items-stretch gap-2', className)}>
      {STEPS.map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;

        /* Step one mirrors the live USB state: red until a board is
           attached, green once it is. The other steps stay neutral. */
        const isConnectStep = step.id === 1;
        const showDisconnected = isConnectStep && !connected;
        const showConnected = isConnectStep && connected;

        const Icon = showConnected || done ? Check : step.icon;
        const hint = showConnected ? 'Connected' : showDisconnected ? 'No board connected' : step.hint;

        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div
              className={clsx(
                'flex flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-300 ease-smooth',
                showDisconnected && 'tint-danger',
                showConnected && 'tint-ok',
                !isConnectStep && active && 'border-brand-500 bg-brand-50 shadow-card',
                !isConnectStep && done && 'tint-ok',
                !isConnectStep && !active && !done && 'border-hairline bg-surface'
              )}
            >
              <span
                className={clsx(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white transition-colors',
                  showDisconnected && 'bg-danger-fg',
                  (showConnected || done) && 'bg-ok-fg',
                  !isConnectStep && !done && (active ? 'bg-brand-600' : 'bg-ink-400')
                )}
              >
                <Icon size={14} strokeWidth={2.4} />
              </span>

              <div className="min-w-0">
                <p
                  className={clsx(
                    'truncate text-xs font-semibold',
                    showDisconnected && 'text-danger-fg',
                    (showConnected || (!isConnectStep && done)) && 'text-ok-fg',
                    !isConnectStep && active && 'text-brand-700',
                    !isConnectStep && !active && !done && 'text-ink-500'
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={clsx(
                    'truncate text-[11px] font-medium',
                    showDisconnected && 'text-danger-fg',
                    showConnected && 'text-ok-fg',
                    !isConnectStep && 'text-ink-500'
                  )}
                >
                  {hint}
                </p>
              </div>
            </div>

            {i < STEPS.length - 1 && (
              <span
                className={clsx(
                  'hidden h-px w-4 shrink-0 transition-colors sm:block',
                  done ? 'bg-ok-line' : 'bg-hairline'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
