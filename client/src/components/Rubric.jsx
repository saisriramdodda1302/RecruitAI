import { useState } from 'react';
import { api } from '../lib/api';

const pick = (criteria) => criteria.map(({ name, weight, mustHave }) => ({ name, weight, mustHave }));

export default function Rubric({ job, onChange }) {
  const [draft, setDraft] = useState(() => pick(job.rubric.criteria));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saved = JSON.stringify(pick(job.rubric.criteria));
  const dirty = JSON.stringify(draft) !== saved;

  const update = (name, patch) => setDraft(draft.map((c) => (c.name === name ? { ...c, ...patch } : c)));

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/jobs/${job.id}/rubric`, { method: 'PATCH', body: { criteria: draft } });
      await onChange();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="card">
      <ul className="divide-y divide-line">
        {job.rubric.criteria.map((c) => {
          const d = draft.find((x) => x.name === c.name);
          return (
            <li key={c.name} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted">{c.description}</p>
              </div>
              <div className="flex items-center gap-5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[rgb(var(--accent))]"
                    checked={d.mustHave}
                    onChange={(e) => update(c.name, { mustHave: e.target.checked })}
                  />
                  Must have
                </label>
                <Weight value={d.weight} name={c.name} onChange={(weight) => update(c.name, { weight })} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
        <p className="text-sm text-muted">
          Changing weights re-ranks screened candidates instantly. Resumes are not read again.
        </p>
        {dirty && (
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => setDraft(JSON.parse(saved))} disabled={busy}>
              Reset
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save and re-rank'}
            </button>
          </div>
        )}
      </div>
      {error && <p className="px-5 pb-3 text-sm text-bad">{error}</p>}
    </div>
  );
}

function Weight({ value, name, onChange }) {
  return (
    <div role="radiogroup" aria-label={`Weight for ${name}`} className="flex overflow-hidden rounded-lg border border-line">
      {[1, 2, 3, 4, 5].map((w) => (
        <button
          key={w}
          type="button"
          role="radio"
          aria-checked={value === w}
          onClick={() => onChange(w)}
          className={`h-8 w-8 text-sm tabular-nums transition-colors ${
            value === w ? 'bg-accent text-on-accent' : 'text-muted hover:bg-line/50 hover:text-ink'
          }`}
        >
          {w}
        </button>
      ))}
    </div>
  );
}
