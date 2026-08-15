'use client';

import { useState } from 'react';
import { Radio, RotateCcw, Send, TerminalSquare } from 'lucide-react';
import Terminal from '@/components/ui/Terminal';
import { BAUD_RATES } from '@/services/serial';

const LINE_ENDINGS = [
  { label: 'NL + CR', value: '\r\n' },
  { label: 'Newline', value: '\n' },
  { label: 'CR', value: '\r' },
  { label: 'None', value: '' },
];

export default function SerialMonitor({
  lines, baud, setBaud, running, onToggle, onSend, onClear, onResetBoard, canUse,
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
    <div className="space-y-3 px-5 pb-5">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onToggle} disabled={!canUse} className={running ? 'btn-danger-soft btn-sm' : 'btn-primary btn-sm'}>
          <Radio size={12} /> {running ? 'Stop monitor' : 'Start monitor'}
        </button>

        <select value={baud} onChange={(e) => setBaud(Number(e.target.value))} disabled={running} className="field field-sm w-auto">
          {BAUD_RATES.map((b) => <option key={b} value={b}>{b} baud</option>)}
        </select>

        <select value={ending} onChange={(e) => setEnding(e.target.value)} className="field field-sm w-auto">
          {LINE_ENDINGS.map((l) => <option key={l.label} value={l.value}>{l.label}</option>)}
        </select>

        <button onClick={onResetBoard} disabled={!canUse} className="btn-ghost btn-sm" title="Restart the board so it runs your sketch">
          <RotateCcw size={12} /> Reset board
        </button>

        {running && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok-fg">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok-fg" /> live
          </span>
        )}
      </div>

      <Terminal
        lines={lines}
        onClear={onClear}
        height="h-64"
        emptyHint={
          canUse
            ? 'Start the monitor to stream Serial.println() output. Connecting leaves the board in download mode, so the monitor resets it into run mode for you.'
            : 'Connect a board to use the serial monitor.'
        }
      />

      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <TerminalSquare size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!running}
            placeholder={running ? 'Send a command to the device…' : 'Monitor is stopped'}
            className="field pl-9 font-mono text-xs"
          />
        </div>
        <button type="submit" disabled={!running || !draft.trim()} className="btn-ghost btn-sm">
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}
