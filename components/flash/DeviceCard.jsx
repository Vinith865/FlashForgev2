'use client';

import clsx from 'clsx';
import { Cable, Cpu, Sparkles } from 'lucide-react';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline px-3.5 py-2.5 last:border-0">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="truncate font-mono text-xs text-ink-900">{value}</span>
    </div>
  );
}

export default function DeviceCard({ mode, setMode, chip, portInfo, deviceInfo, onInspect, disabled, busy }) {
  return (
    <div className="space-y-4 px-5 pb-5">
      {/* Target selector */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-hairline bg-canvas p-1">
        {[
          { id: 'esp', label: 'ESP32', icon: Cpu },
          { id: 'arduino', label: 'Arduino', icon: Cable },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            disabled={busy}
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
              mode === m.id ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            )}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-900">Device information</p>
          <button onClick={onInspect} disabled={disabled} className="btn-text btn-sm">
            <Sparkles size={12} /> Inspect
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-hairline">
          <Row label="Chip" value={chip || 'Not connected'} />
          <Row label="Adapter" value={portInfo?.vendor || '—'} />
          <Row label="USB ID" value={portInfo ? `${portInfo.vid}:${portInfo.pid}` : '—'} />
          <Row label="MAC address" value={deviceInfo?.mac || '—'} />
          <Row label="Flash size" value={deviceInfo?.flashSize || '—'} />
          {deviceInfo?.crystal && <Row label="Crystal" value={deviceInfo.crystal} />}
        </div>

        {deviceInfo?.features?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {deviceInfo.features.map((f) => <span key={f} className="chip-tag">{f}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
