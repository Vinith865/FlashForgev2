'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { UploadCloud, FileCode2, X } from 'lucide-react';

const OFFSET_PRESETS = [
  { label: 'Bootloader', value: 0x1000 },
  { label: 'Partitions', value: 0x8000 },
  { label: 'OTA data', value: 0xe000 },
  { label: 'App', value: 0x10000 },
];

export default function DropZone({ files, onAdd, onUpdateOffset, onRemove, mode }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  return (
    <div className="space-y-3 px-5 py-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAdd(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'group cursor-pointer rounded-xl border border-dashed px-4 py-7 text-center transition-all',
          dragging
            ? 'border-neon-cyan/60 bg-neon-cyan/[0.08]'
            : 'border-white/15 bg-white/[0.02] hover:border-neon-cyan/40 hover:bg-white/[0.05]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".bin,.hex"
          className="hidden"
          onChange={(e) => { onAdd(e.target.files); e.target.value = ''; }}
        />
        <UploadCloud
          size={26}
          className={clsx('mx-auto mb-2 transition-colors', dragging ? 'text-neon-cyan' : 'text-slate-500 group-hover:text-neon-cyan')}
        />
        <p className="text-xs font-medium text-slate-300">
          Drop <span className="font-mono text-neon-cyan">.bin</span>
          {mode === 'arduino' && <> / <span className="font-mono text-neon-cyan">.hex</span></>} files here
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Flash your own build without uploading it anywhere</p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <FileCode2 size={14} className="shrink-0 text-neon-violet" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-200">{entry.file.name}</p>
                <p className="font-mono text-[10px] text-slate-500">{(entry.file.size / 1024).toFixed(1)} KB</p>
              </div>

              {mode === 'esp' && (
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-slate-500">0x</span>
                  <input
                    value={Number(entry.offset).toString(16)}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value || '0', 16);
                      onUpdateOffset(entry.id, Number.isFinite(parsed) ? parsed : 0);
                    }}
                    className="field field-sm w-20 font-mono"
                    spellCheck={false}
                  />
                </div>
              )}

              <button onClick={() => onRemove(entry.id)} className="rounded p-1 text-slate-500 transition hover:text-rose-300">
                <X size={13} />
              </button>
            </li>
          ))}

          {mode === 'esp' && (
            <li className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-600">Common offsets:</span>
              {OFFSET_PRESETS.map((p) => (
                <span key={p.label} className="font-mono text-[10px] text-slate-500">
                  {p.label} 0x{p.value.toString(16)}
                </span>
              ))}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
