'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Send, TerminalSquare, Radio } from 'lucide-react';
import Terminal from '@/components/ui/Terminal';
import { BAUD_RATES } from '@/services/serial';

const LINE_ENDINGS = [
  { label: 'NL + CR', value: '\r\n' },
  { label: 'Newline', value: '\n' },
  { label: 'CR', value: '\r' },
  { label: 'None', value: '' },
];

export default function SerialMonitor({
  lines, baud, setBaud, running, onToggle, onSend, onClear, canUse,
}) {
  const [draft, setDraft] = useState('');
  const [ending, setEnding] = useState('\r\n');

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft, ending);
    setDraft('');
  };

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onToggle}
          disabled={!canUse}
          className={clsx('btn-sm', running ? 'btn-danger' : 'btn-primary')}
        >
          <Radio size={12} /> {running ? 'Stop monitor' : 'Start monitor'}
        </button>

        <select
          value={baud}
          onChange={(e) => setBaud(Number(e.target.value))}
          disabled={running}
          className="field field-sm w-auto"
        >
          {BAUD_RATES.map((b) => <option key={b} value={b}>{b} baud</option>)}
        </select>

        <select value={ending} onChange={(e) => setEnding(e.target.value)} className="field field-sm w-auto">
          {LINE_ENDINGS.map((l) => <option key={l.label} value={l.value}>{l.label}</option>)}
        </select>

        {running && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-neon-lime">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-lime" /> live
          </span>
        )}
      </div>

      <Terminal
        lines={lines}
        onClear={onClear}
        height="h-64"
        emptyHint={
          canUse
            ? 'Start the monitor to stream Serial.println() output from your board.'
            : 'Connect a board to use the serial monitor.'
        }
      />

      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <TerminalSquare size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!running}
            placeholder={running ? 'Send a command to the device…' : 'Monitor is stopped'}
            className="field pl-9 font-mono text-xs"
          />
        </div>
        <button type="submit" disabled={!running || !draft.trim()} className="btn-ghost btn-sm">
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
