'use client';

import { useRef, useState } from 'react';
import { Check, FileCode2, Loader2, Plus, Trash2 } from 'lucide-react';
import { guessOffset } from './upload';

export default function FileManager({ project, onAdd, onSetOffset, onRemove, busy }) {
  const [drafts, setDrafts] = useState({});
  const inputRef = useRef(null);
  const files = project.firmware?.files || [];

  const offsetValue = (file) => drafts[file.filename] ?? Number(file.offset).toString(16);

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {files.map((file) => {
          const dirty =
            drafts[file.filename] !== undefined &&
            parseInt(drafts[file.filename] || '0', 16) !== Number(file.offset);

          return (
            <li key={file.filename} className="row-hover flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2">
              <FileCode2 size={15} className="shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink-900">{file.filename}</p>
                <p className="font-mono text-[10px] text-ink-500">
                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'size unknown'}
                </p>
              </div>

              <span className="font-mono text-[10px] text-ink-500">Hex:</span>
              <input
                value={offsetValue(file)}
                onChange={(e) => setDrafts({ ...drafts, [file.filename]: e.target.value.replace(/[^0-9a-fA-F]/g, '') })}
                className="field field-sm w-24 font-mono"
                spellCheck={false}
              />

              {dirty && (
                <button
                  onClick={async () => {
                    await onSetOffset(file.filename, parseInt(drafts[file.filename], 16));
                    setDrafts((d) => {
                      const next = { ...d };
                      delete next[file.filename];
                      return next;
                    });
                  }}
                  disabled={busy}
                  className="rounded p-1 text-emerald-600 transition hover:bg-emerald-50"
                  title="Save offset"
                >
                  <Check size={14} />
                </button>
              )}

              <button
                onClick={() => onRemove(file.filename)}
                disabled={busy || files.length === 1}
                title={files.length === 1 ? 'A project needs at least one file' : 'Remove file'}
                className="rounded p-1 text-ink-400 transition hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".bin,.hex"
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files || []).map((file) => ({ file, offset: guessOffset(file.name) }));
          e.target.value = '';
          if (list.length) onAdd(list);
        }}
      />
      <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-ghost btn-sm w-full">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add firmware file
      </button>
      <p className="text-[10px] leading-relaxed text-ink-500">
        Uploading a file with a name that already exists replaces that part.
      </p>
    </div>
  );
}
