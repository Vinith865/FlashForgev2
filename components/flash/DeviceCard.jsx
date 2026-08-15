'use client';

import clsx from 'clsx';
import { Cable, Cpu, Sparkles } from 'lucide-react';
import BoardArt from './BoardArt';

function Row({ label, value }) {
  return (
    <div className="row-hover flex items-center justify-between gap-3 border-b border-hairline px-3.5 py-2.5 last:border-0">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="truncate font-mono text-xs tracking-tight text-ink-900 nums">{value}</span>
    </div>
  );
}

const ESP_TARGETS = [
  { value: 'ESP32', label: 'ESP32' },
  { value: 'ESP8266', label: 'ESP8266 / NodeMCU' },
  { value: 'ESP32-S2', label: 'ESP32-S2' },
  { value: 'ESP32-S3', label: 'ESP32-S3' },
  { value: 'ESP32-C3', label: 'ESP32-C3' },
  { value: 'ESP32-C6', label: 'ESP32-C6' },
];

export default function DeviceCard({
  mode, setMode, chip, portInfo, deviceInfo, onInspect, disabled, busy,
  espTarget, setEspTarget, board, setBoard, actions,
}) {
  return (
    <div className="space-y-4 px-5 pb-5">
      {/* Target selector */}
      <div className="segment grid-cols-2">
        {[
          { id: 'esp', label: 'ESP32', icon: Cpu },
          { id: 'arduino', label: 'Arduino', icon: Cable },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            disabled={busy}
            className={clsx('segment-item', mode === m.id && 'segment-item-active')}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      {mode === 'esp' ? (
        <div>
          <label className="label mb-1.5 block">Target chip</label>
          <select
            value={espTarget}
            onChange={(e) => setEspTarget(e.target.value)}
            disabled={busy}
            className="field"
          >
            {ESP_TARGETS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
            CH340 and CP2102 adapters are shared by ESP32 and ESP8266 boards, so the
            chip cannot be read from USB — pick the one you have.
          </p>
        </div>
      ) : (
        <div>
          <label className="label mb-1.5 block">Board</label>
          <select value={board} onChange={(e) => setBoard(e.target.value)} disabled={busy} className="field">
            {['Arduino Uno', 'Arduino Nano', 'Arduino Mega'].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}

      {actions}

      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas px-3 py-2.5">
        <BoardArt chip={chip} size={46} lit={Boolean(chip)} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{chip || 'No board connected'}</p>
          <p className="truncate text-[11px] text-ink-500">
            {chip ? `${portInfo?.vendor || 'USB'} · ready` : 'Plug in over USB and press Connect'}
          </p>
        </div>
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
