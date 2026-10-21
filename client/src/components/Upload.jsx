import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { api } from '../lib/api';

const ACCEPT = '.pdf,.docx,.txt';

export default function Upload({ jobId, onDone }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const send = async (files) => {
    if (!files.length) return;
    setBusy(true);
    setLog([]);
    const queue = [...files];
    const results = [];

    const worker = async () => {
      while (queue.length) {
        const file = queue.shift();
        const form = new FormData();
        form.append('files', file);
        try {
          const res = await api(`/jobs/${jobId}/candidates`, { method: 'POST', form });
          results.push(res.added ? { file: file.name, ok: true } : { file: file.name, reason: res.skipped[0]?.reason });
        } catch (err) {
          results.push({ file: file.name, reason: err.message });
        }
        setLog([...results]);
        onDone();
      }
    };

    await Promise.all([worker(), worker()]);
    setBusy(false);
  };

  const drop = (e) => {
    e.preventDefault();
    setOver(false);
    if (!busy) send([...e.dataTransfer.files]);
  };

  const skipped = log.filter((r) => !r.ok);
  const added = log.length - skipped.length;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${
          over ? 'border-accent bg-accent/5' : 'border-line'
        }`}
      >
        <FileUp className="h-6 w-6 text-muted" aria-hidden="true" />
        <p>
          Drop resumes here or{' '}
          <button type="button" className="text-accent hover:underline" onClick={() => input.current.click()} disabled={busy}>
            choose files
          </button>
        </p>
        <p className="text-sm text-muted">PDF, DOCX or TXT, up to 5 MB each. Duplicates are skipped.</p>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            send([...e.target.files]);
            e.target.value = '';
          }}
        />
      </div>

      {log.length > 0 && (
        <div className="mt-3 text-sm" aria-live="polite">
          <p className="text-muted">
            {busy ? 'Uploading… ' : ''}
            {added} added{skipped.length ? `, ${skipped.length} skipped` : ''}.
          </p>
          {skipped.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {skipped.map((r) => (
                <li key={r.file} className="text-bad">
                  {r.file}: {r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
