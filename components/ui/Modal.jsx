'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6">
      <div className="absolute inset-0 animate-fadeIn bg-ink-900/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${width} animate-slideUp overflow-hidden rounded-2xl bg-surface shadow-lift`}>
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink-900">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-ink-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 transition hover:bg-muted hover:text-ink-700">
            <X size={16} />
          </button>
        </div>
        <div className="scroll-thin max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-hairline bg-canvas px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
