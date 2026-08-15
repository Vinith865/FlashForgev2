'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { FileCode2, UploadCloud, X } from 'lucide-react';

export default function DropZone({ files, onAdd, onUpdateOffset, onRemove, mode }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  return (
    <div className="space-y-3 px-5 pb-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onAdd(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ease-smooth',
          dragging
            ? 'scale-[1.01] border-brand-500 bg-brand-50 shadow-inset'
            : 'border-brand-200 bg-brand-50/40 hover:border-brand-400 hover:bg-brand-50'
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
        <UploadCloud size={30} className={clsx('mx-auto mb-2 transition-transform duration-300 ease-smooth', dragging ? 'scale-110 text-brand-600' : 'text-brand-500')} />
        <p className="text-sm font-medium text-ink-700">Drag &amp; drop firmware file here</p>
        <p className="mt-0.5 text-xs font-medium text-brand-600">or click to browse</p>
        <p className="mt-1.5 text-[11px] text-ink-500">
          Supports: .bin{mode === 'arduino' ? ', .hex' : ', .hex'} — nothing is uploaded anywhere
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2">
              <FileCode2 size={15} className="shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink-900">{entry.file.name}</p>
                <p className="font-mono text-[10px] text-ink-500">{(entry.file.size / 1024).toFixed(1)} KB</p>
              </div>

              {mode === 'esp' && (
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-ink-500">0x</span>
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

              <button onClick={() => onRemove(entry.id)} className="rounded p-1 text-ink-400 transition hover:text-danger-fg">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
