'use client';

import Link from 'next/link';
import { Cpu, ShieldCheck, Github, Zap } from 'lucide-react';
import StatusPill from '@/components/ui/StatusPill';

export default function Header({ status, chip, portInfo }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-900/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-neon-cyan/25 to-neon-violet/25">
            <Cpu size={19} className="text-neon-cyan" />
            <span className="absolute inset-0 rounded-xl bg-neon-cyan/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-slate-100">
              Flash<span className="text-gradient">Forge</span>
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block">ESP32 · Arduino web flasher</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {chip && (
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 md:inline-flex">
              <Zap size={12} className="text-neon-amber" />
              {chip}
              {portInfo && <span className="font-mono text-[10px] text-slate-500">{portInfo.vid}:{portInfo.pid}</span>}
            </span>
          )}
          <StatusPill status={status} />
          <Link href="/admin" className="btn-ghost btn-sm hidden sm:inline-flex" title="Admin console">
            <ShieldCheck size={14} /> Admin
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-slate-200 lg:block"
            title="Source"
          >
            <Github size={16} />
          </a>
        </div>
      </div>
    </header>
  );
}
