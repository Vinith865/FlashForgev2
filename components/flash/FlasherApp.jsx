'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Cable, Cpu, Eraser, FolderOpen, History, Package,
  PlugZap, RotateCcw, ScrollText, Terminal as TerminalIcon, Zap, Star,
} from 'lucide-react';
import clsx from 'clsx';

import Header from '@/components/layout/Header';
import Panel, { PanelHeader } from '@/components/ui/Panel';
import ProgressBar from '@/components/ui/ProgressBar';
import Terminal from '@/components/ui/Terminal';
import EmptyState from '@/components/ui/EmptyState';
import FilterBar from './FilterBar';
import ProjectCard from './ProjectCard';
import ProjectDetail from './ProjectDetail';
import DropZone from './DropZone';
import DeviceCard from './DeviceCard';
import SerialMonitor from './SerialMonitor';
import HistoryPanel from './HistoryPanel';

import { useFlasher, STATUS } from '@/hooks/useFlasher';
import { useProjects } from '@/hooks/useProjects';
import { useFavorites } from '@/hooks/useFavorites';

const TABS = [
  { id: 'console', label: 'Console', icon: ScrollText },
  { id: 'monitor', label: 'Serial monitor', icon: TerminalIcon },
  { id: 'history', label: 'History', icon: History },
];

export default function FlasherApp() {
  const f = useFlasher();
  const p = useProjects();
  const { toggle: toggleFavorite, isFavorite, favorites } = useFavorites();

  const [tab, setTab] = useState('console');
  const [detail, setDetail] = useState(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  /* Deep link: /?project=my-project */
  useEffect(() => {
    if (p.loading || !p.items.length) return;
    const id = new URLSearchParams(window.location.search).get('project');
    if (!id) return;
    const match = p.items.find((x) => x.id === id);
    if (match) f.selectProject(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.loading, p.items]);

  const visible = useMemo(
    () => (onlyFavorites ? p.filtered.filter((x) => favorites.includes(x.id)) : p.filtered),
    [p.filtered, onlyFavorites, favorites]
  );

  const canFlash =
    (f.status === STATUS.READY || f.status === STATUS.DONE || f.status === STATUS.ERROR) &&
    (Boolean(f.selectedProject) || f.customFiles.length > 0);

  const target = f.selectedProject
    ? `${f.selectedProject.name} v${f.selectedProject.version}`
    : f.customFiles.length
    ? `${f.customFiles.length} local file(s)`
    : 'Nothing selected';

  return (
    <>
      <Header status={f.status} chip={f.detectedChip} portInfo={f.portInfo} />

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mb-6 animate-slideUp">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-neon-cyan" />
                Web Serial · no drivers, no install
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                Flash firmware <span className="text-gradient">from your browser</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                Pick a project or drop your own build, connect over USB, and write it to an ESP32 or
                Arduino in seconds — with a live serial monitor built in.
              </p>
            </div>

            <div className="flex gap-2">
              {[
                { label: 'Projects', value: p.meta.totalAll ?? p.items.length },
                { label: 'Flashes', value: f.stats.total },
                { label: 'Success', value: `${f.stats.total ? Math.round((f.stats.success / f.stats.total) * 100) : 0}%` },
              ].map((s) => (
                <div key={s.label} className="glass min-w-[86px] px-4 py-3 text-center">
                  <p className="font-mono text-lg font-semibold tabular-nums text-slate-100">{s.value}</p>
                  <p className="label mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!f.isSupported && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-5 py-4 animate-slideUp">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Web Serial isn&apos;t available here</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
                Use Chrome, Edge or Opera on desktop. Firefox, Safari and all mobile browsers do not
                implement the Web Serial API. The site must also be served over HTTPS (or localhost).
              </p>
            </div>
          </div>
        )}

        {/* ── Workspace ────────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* Left column */}
          <div className="space-y-5">
            <Panel className="animate-slideUp animate-delay-100">
              <PanelHeader
                icon={Package}
                title="Firmware library"
                subtitle="Curated builds ready to flash"
                actions={
                  <button
                    onClick={() => setOnlyFavorites((v) => !v)}
                    className={clsx('chip', onlyFavorites && 'chip-active')}
                  >
                    <Star size={11} fill={onlyFavorites ? 'currentColor' : 'none'} /> Favourites
                  </button>
                }
              />

              <FilterBar
                search={p.search} setSearch={p.setSearch}
                category={p.category} setCategory={p.setCategory}
                board={p.board} setBoard={p.setBoard}
                sort={p.sort} setSort={p.setSort}
                categories={p.meta.categories || []}
                boards={p.meta.boards || []}
                count={visible.length}
                total={p.items.length}
              />

              <div className="border-t border-white/[0.06]">
                {p.loading ? (
                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-white/[0.04]" />
                    ))}
                  </div>
                ) : p.error ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="Could not load projects"
                    description={p.error}
                    action={<button onClick={p.reload} className="btn-ghost btn-sm mt-2"><RotateCcw size={12} /> Retry</button>}
                  />
                ) : visible.length === 0 ? (
                  <EmptyState
                    icon={FolderOpen}
                    title={p.items.length ? 'No projects match your filters' : 'The library is empty'}
                    description={
                      p.items.length
                        ? 'Try clearing the search box or switching the board filter.'
                        : 'Upload firmware from the admin console, or drop a local .bin file below to flash it directly.'
                    }
                  />
                ) : (
                  <div className="scroll-thin grid max-h-[540px] gap-3 overflow-y-auto p-5 sm:grid-cols-2">
                    {visible.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        selected={f.selectedProject?.id === project.id}
                        favorite={isFavorite(project.id)}
                        onSelect={f.selectProject}
                        onToggleFavorite={toggleFavorite}
                        onOpenDetail={setDetail}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {/* Output tabs */}
            <Panel className="animate-slideUp animate-delay-200">
              <div className="flex items-center gap-1 border-b border-white/[0.07] px-3 py-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                      tab === t.id
                        ? 'bg-white/[0.08] text-slate-100'
                        : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                    )}
                  >
                    <t.icon size={13} /> {t.label}
                    {t.id === 'history' && f.stats.total > 0 && (
                      <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{f.stats.total}</span>
                    )}
                  </button>
                ))}
              </div>

              {tab === 'console' && (
                <div className="px-5 py-4">
                  <Terminal
                    lines={f.logs}
                    onClear={f.clearLogs}
                    height="h-[20rem]"
                    emptyHint="Connect a board to begin. Everything the flasher does is logged here."
                  />
                </div>
              )}

              {tab === 'monitor' && (
                <SerialMonitor
                  lines={f.monitorLines}
                  baud={f.monitorBaud}
                  setBaud={f.setMonitorBaud}
                  running={f.monitorOn}
                  onToggle={f.toggleMonitor}
                  onSend={f.sendMonitorLine}
                  onClear={f.clearMonitor}
                  canUse={f.isConnected && f.status !== STATUS.FLASHING}
                />
              )}

              {tab === 'history' && (
                <HistoryPanel history={f.history} stats={f.stats} onClear={f.clearHistory} />
              )}
            </Panel>
          </div>

          {/* Right column — control deck */}
          <div className="space-y-5 xl:sticky xl:top-[5.5rem] xl:self-start">
            <Panel className="animate-slideUp animate-delay-100">
              <PanelHeader icon={PlugZap} title="Control deck" subtitle={target} accent="violet" />

              {/* Mode switch */}
              <div className="px-5 pt-4">
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  {[
                    { id: 'esp', label: 'ESP32', icon: Cpu },
                    { id: 'arduino', label: 'Arduino', icon: Cable },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => f.setMode(m.id)}
                      disabled={f.isBusy}
                      className={clsx(
                        'inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all',
                        f.mode === m.id
                          ? 'bg-gradient-to-r from-neon-cyan/25 to-neon-violet/25 text-slate-50 shadow-glow'
                          : 'text-slate-500 hover:text-slate-300'
                      )}
                    >
                      <m.icon size={13} /> {m.label}
                    </button>
                  ))}
                </div>

                {f.mode === 'arduino' && (
                  <select
                    value={f.board}
                    onChange={(e) => f.setBoard(e.target.value)}
                    className="field field-sm mt-2"
                  >
                    {['Arduino Uno', 'Arduino Nano', 'Arduino Mega'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                )}
              </div>

              <DeviceCard
                chip={f.detectedChip}
                portInfo={f.portInfo}
                deviceInfo={f.deviceInfo}
                onInspect={f.inspect}
                disabled={!f.isConnected || f.isBusy || f.mode !== 'esp'}
              />

              <div className="space-y-3 px-5 pb-5">
                <ProgressBar
                  value={f.progress}
                  label={f.progressLabel || (f.status === STATUS.DONE ? 'Flash complete' : 'Idle')}
                  active={f.status === STATUS.FLASHING}
                  tone={f.status === STATUS.DONE ? 'lime' : 'cyan'}
                />

                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <input
                    type="checkbox"
                    checked={f.eraseAll}
                    onChange={(e) => f.setEraseAll(e.target.checked)}
                    disabled={f.mode !== 'esp' || f.isBusy}
                    className="h-3.5 w-3.5 accent-cyan-400"
                  />
                  <Eraser size={13} className="text-slate-500" />
                  <span className="text-xs text-slate-300">Erase entire flash first</span>
                  <span className="ml-auto text-[10px] text-slate-600">slower</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={f.isConnected ? f.reset : f.connect}
                    disabled={!f.isSupported || f.isBusy}
                    className={f.isConnected ? 'btn-ghost' : 'btn-primary'}
                  >
                    {f.isConnected ? <><RotateCcw size={14} /> Disconnect</> : <><PlugZap size={14} /> Connect</>}
                  </button>

                  <button
                    onClick={f.status === STATUS.FLASHING ? f.abort : f.flash}
                    disabled={f.status === STATUS.FLASHING ? false : !canFlash}
                    className={f.status === STATUS.FLASHING ? 'btn-danger' : 'btn-primary'}
                  >
                    {f.status === STATUS.FLASHING ? <>Abort</> : <><Zap size={14} /> Flash</>}
                  </button>
                </div>

                {f.status === STATUS.DONE && (
                  <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-3.5 py-2.5 text-xs text-emerald-200">
                    Done. Switch to the serial monitor tab to watch it boot.
                  </p>
                )}
              </div>
            </Panel>

            <Panel className="animate-slideUp animate-delay-200">
              <PanelHeader icon={FolderOpen} title="Custom firmware" subtitle="Flash a local build" accent="lime" />
              <DropZone
                files={f.customFiles}
                onAdd={f.addCustomFiles}
                onUpdateOffset={f.updateCustomOffset}
                onRemove={f.removeCustomFile}
                mode={f.mode}
              />
            </Panel>
          </div>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-6 text-[11px] text-slate-600">
          <p>FlashForge · built on esptool-js and the Web Serial API</p>
          <p className="font-mono">Chrome 89+ · Edge 89+ · Opera 76+ · desktop only</p>
        </footer>
      </main>

      <ProjectDetail
        project={detail}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        onFlash={f.selectProject}
      />
    </>
  );
}
