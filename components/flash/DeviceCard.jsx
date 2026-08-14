'use client';

import { Cpu, Fingerprint, HardDrive, Radio, Sparkles } from 'lucide-react';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        <Icon size={13} className="text-slate-600" />
        {label}
      </span>
      <span className="truncate font-mono text-[11px] text-slate-200">{value}</span>
    </div>
  );
}

export default function DeviceCard({ chip, portInfo, deviceInfo, onInspect, disabled }) {
  return (
    <div className="px-5 py-4">
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-neon-cyan/25 bg-neon-cyan/10">
              <Cpu size={19} className="text-neon-cyan" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-100">{chip || 'No device'}</p>
              <p className="text-[11px] text-slate-500">{portInfo ? portInfo.vendor : 'Not connected'}</p>
            </div>
          </div>
          <button onClick={onInspect} disabled={disabled} className="btn-ghost btn-sm">
            <Sparkles size={12} /> Inspect
          </button>
        </div>

        {(portInfo || deviceInfo) && (
          <div className="mt-3 divide-y divide-white/[0.06] border-t border-white/[0.06] pt-1">
            {portInfo && <Row icon={Radio} label="USB ID" value={`${portInfo.vid}:${portInfo.pid}`} />}
            {deviceInfo?.mac && <Row icon={Fingerprint} label="MAC address" value={deviceInfo.mac} />}
            {deviceInfo?.flashSize && <Row icon={HardDrive} label="Flash size" value={deviceInfo.flashSize} />}
            {deviceInfo?.crystal && <Row icon={Radio} label="Crystal" value={deviceInfo.crystal} />}
            {deviceInfo?.features?.length > 0 && (
              <div className="py-2">
                <p className="mb-1.5 text-xs text-slate-500">Features</p>
                <div className="flex flex-wrap gap-1">
                  {deviceInfo.features.map((f) => (
                    <span key={f} className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
