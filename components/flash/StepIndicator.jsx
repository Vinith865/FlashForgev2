'use client';

import clsx from 'clsx';
import { Check, Cpu, Package, Zap } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Connect', hint: 'Plug in over USB', icon: Cpu },
  { id: 2, label: 'Choose', hint: 'Pick firmware', icon: Package },
  { id: 3, label: 'Flash', hint: 'Write to the board', icon: Zap },
];

export default function StepIndicator({ current, className }) {
  return (
    <ol className={clsx('flex items-stretch gap-2', className)}>
      {STEPS.map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;
        const Icon = done ? Check : step.icon;

        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div
              className={clsx(
                'flex flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-300 ease-smooth',
                active && 'border-brand-500 bg-brand-50 shadow-card',
                done && 'border-emerald-200 bg-emerald-50/60',
                !active && !done && 'border-hairline bg-surface'
              )}
            >
              <span
                className={clsx(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white transition-colors',
                  done ? 'bg-emerald-500' : active ? 'bg-brand-600' : 'bg-slate-300'
                )}
              >
                <Icon size={14} strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p
                  className={clsx(
                    'truncate text-xs font-semibold',
                    done ? 'text-emerald-700' : active ? 'text-brand-700' : 'text-ink-500'
                  )}
                >
                  {step.label}
                </p>
                <p className="truncate text-[11px] text-ink-500">{step.hint}</p>
              </div>
            </div>

            {i < STEPS.length - 1 && (
              <span
                className={clsx(
                  'hidden h-px w-4 shrink-0 transition-colors sm:block',
                  done ? 'bg-emerald-300' : 'bg-hairline'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
