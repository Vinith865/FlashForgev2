'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import StatusPill from '@/components/ui/StatusPill';

export default function Header({ status, chip, portInfo }) {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="TE Flasher"
            width={38}
            height={38}
            className="h-[38px] w-[38px] transition-transform duration-300 ease-smooth hover:scale-[1.05]"
          />
          <span className="text-[17px] font-semibold tracking-tight text-ink-900">
            TE<span className="text-brand-600"> Flasher</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {chip && (
            <span className="hidden items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 md:inline-flex">
              {chip}
              {portInfo && (
                <span className="font-mono text-[10px] text-brand-500">
                  {portInfo.vid}:{portInfo.pid}
                </span>
              )}
            </span>
          )}

          <StatusPill status={status} />

          <Link href="/admin" className="btn-ghost btn-sm hidden sm:inline-flex" title="Admin console">
            <ShieldCheck size={14} /> Admin
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
