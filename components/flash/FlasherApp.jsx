'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle, Clock, Eraser, FolderOpen, MonitorDot, Package,
  PlugZap, RotateCcw, ScrollText, UploadCloud, Zap,
} from 'lucide-react';

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
  { id: 'monitor', label: 'Monitor', icon: MonitorDot },
  { id: 'history', label: 'History', icon: Clock },
];

export default function FlasherApp() {
  const f = useFlasher();
  const p = useProjects();
  const { toggle: toggleFavorite, isFavorite, favorites } = useFavorites();

  const [tab, setTab] = useState('console');
  const [detail, setDetail] = useState(null);
  const [quick, setQuick] = useState('all');

  /* Deep link: /?project=my-project */
  useEffect(() => {
    if (p.loading || !p.items.length) return;
    const id = new URLSearchParams(window.location.search).get('project');
    if (!id) return;
    const match = p.items.find((x) => x.id === id);
    if (match) f.selectProject(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.loading, p.items]);

  const visible = useMemo(() => {
    if (quick === 'favorites') return p.filtered.filter((x) => favorites.includes(x.id));
    if (quick === 'esp') return p.filtered.filter((x) => (x.supportedBoards || []).some((b) => b.startsWith('ESP32')));
    if (quick === 'arduino') return p.filtered.filter((x) => (x.supportedBoards || []).some((b) => b.includes('Arduino')));
    return p.filtered;
  }, [p.filtered, quick, favorites]);

  const canFlash =
    (f.status === STATUS.READY || f.status === STATUS.DONE || f.status === STATUS.ERROR) &&
    (Boolean(f.selectedProject) || f.customFiles.length > 0);

  const stats = [
    { value: p.meta.totalAll ?? p.items.length, label: 'Projects' },
    { value: f.isConnected ? 1 : 0, label: 'Devices connected' },
    { value: f.stats.total, label: 'Flashes completed' },
  ];

  return (
    <>
      <Header status={f.status} chip={f.detectedChip} portInfo={f.portInfo} />

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-8 sm:px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mb-7 flex flex-wrap items-start justify-between gap-6 animate-slideUp">
          <div>
            <h1 className="text-4xl font-bold text-ink-900 sm:text-[2.9rem] sm:leading-[1.08]">
              Flash. Verify. Deploy.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
              Flash firmware to ESP32 and Arduino boards straight from your browser — no drivers,
              no IDE, no install.
            </p>
          </div>

          <div className="flex gap-3">
            {stats.map((s) => (
              <div key={s.label} className="stat-card min-w-[8rem]">
                <p className="text-[28px] font-bold leading-none tracking-tight text-ink-900 nums">{s.value}</p>
                <p className="mt-1.5 text-xs font-medium text-ink-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {!f.isSupported && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 animate-slideUp">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Web Serial isn&apos;t available here</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
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
              <FilterBar
                search={p.search} setSearch={p.setSearch}
                category={p.category} setCategory={p.setCategory}
                board={p.board} setBoard={p.setBoard}
                sort={p.sort} setSort={p.setSort}
                categories={p.meta.categories || []}
                boards={p.meta.boards || []}
                quick={quick} setQuick={setQuick}
                count={visible.length}
                total={p.items.length}
              />

              {p.loading ? (
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-[104px]" />
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
                      : 'Upload firmware from the admin console, or drop a local .bin file to flash it directly.'
                  }
                />
              ) : (
                <div className="scroll-thin grid max-h-[560px] gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
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
            </Panel>

            {/* Output tabs */}
            <Panel className="animate-slideUp animate-delay-200">
              <div className="flex items-center justify-between border-b border-hairline px-5">
                <div className="flex items-center gap-1">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={clsx('tab inline-flex items-center gap-2', tab === t.id && 'tab-active')}
                    >
                      <t.icon size={14} /> {t.label}
                      {t.id === 'history' && f.stats.total > 0 && (
                        <span className="rounded-full bg-brand-50 px-1.5 text-[10px] text-brand-600">{f.stats.total}</span>
                      )}
                    </button>
                  ))}
                </div>
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
                <div className="pt-4">
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
                </div>
              )}

              {tab === 'history' && (
                <div className="pt-4">
                  <HistoryPanel history={f.history} stats={f.stats} onClear={f.clearHistory} />
                </div>
              )}
            </Panel>
          </div>

          {/* Right column */}
          <div className="space-y-5 xl:sticky xl:top-[5.5rem] xl:self-start">
            <Panel className="animate-slideUp animate-delay-100">
              <PanelHeader
                icon={PlugZap}
                title="Flash target"
                subtitle={
                  f.selectedProject
                    ? `${f.selectedProject.name} v${f.selectedProject.version}`
                    : f.customFiles.length
                    ? `${f.customFiles.length} local file(s)`
                    : 'Nothing selected'
                }
              />

              <DeviceCard
                mode={f.mode}
                setMode={f.setMode}
                espTarget={f.espTarget}
                setEspTarget={f.setEspTarget}
                board={f.board}
                setBoard={f.setBoard}
                chip={f.detectedChip}
                portInfo={f.portInfo}
                deviceInfo={f.deviceInfo}
                onInspect={f.inspect}
                disabled={!f.isConnected || f.isBusy || f.mode !== 'esp'}
                busy={f.isBusy}
              />

              <div className="space-y-3 border-t border-hairline px-5 py-5">
                <ProgressBar
                  value={f.progress}
                  label={f.progressLabel || (f.status === STATUS.DONE ? 'Flash complete' : 'Flash progress')}
                  active={f.status === STATUS.FLASHING}
                />

                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={f.eraseAll}
                    onChange={(e) => f.setEraseAll(e.target.checked)}
                    disabled={f.mode !== 'esp' || f.isBusy}
                    className="h-4 w-4 rounded accent-brand-600"
                  />
                  <Eraser size={14} className="text-ink-400" />
                  <span className="text-sm text-ink-700">Erase entire flash first</span>
                </label>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={f.status === STATUS.FLASHING ? f.abort : f.flash}
                    disabled={f.status === STATUS.FLASHING ? false : !canFlash}
                    className={f.status === STATUS.FLASHING ? 'btn-danger' : 'btn-primary'}
                  >
                    {f.status === STATUS.FLASHING ? 'Abort' : <><Zap size={14} /> Flash now</>}
                  </button>

                  <button
                    onClick={f.isConnected ? f.reset : f.connect}
                    disabled={!f.isSupported || f.isBusy}
                    className="btn-ghost"
                  >
                    {f.isConnected ? <><RotateCcw size={14} /> Disconnect</> : <><PlugZap size={14} /> Connect</>}
                  </button>
                </div>

                {f.status === STATUS.DONE && (
                  <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
                    Done. Open the Monitor tab to watch it boot.
                  </p>
                )}
              </div>
            </Panel>

            <Panel className="animate-slideUp animate-delay-200">
              <PanelHeader icon={UploadCloud} title="Firmware file" subtitle="Flash your own build" />
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

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6 text-xs text-ink-500">
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
