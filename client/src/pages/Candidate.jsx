import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { fmtScore } from '../lib/format';
import { usePoll } from '../lib/usePoll';
import ScoreBar from '../components/ScoreBar';
import MustHave from '../components/MustHave';

export default function Candidate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(
    () =>
      api(`/candidates/${id}`)
        .then(setC)
        .catch((err) => setError(err.message)),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  usePoll(load, c?.status === 'queued' || c?.status === 'processing');

  const retry = async () => {
    await api(`/candidates/${id}/retry`, { method: 'POST' }).catch((err) => setError(err.message));
    load();
  };

  const remove = async () => {
    await api(`/candidates/${id}`, { method: 'DELETE' });
    navigate(`/jobs/${c.job_id}`);
  };

  if (error && !c) return <p className="text-bad">{error}</p>;
  if (!c) return <p className="text-muted">Loading…</p>;

  const contact = [c.email, c.phone].filter(Boolean);

  return (
    <>
      <Link to={`/jobs/${c.job_id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {c.job_title}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{c.name || c.file_name}</h1>
          <p className="mt-1 break-words text-sm text-muted">
            {contact.length ? `${contact.join(', ')}. ` : ''}From {c.file_name}
          </p>
        </div>
        {confirm ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Remove this candidate?</span>
            <button type="button" className="btn border-bad text-bad" onClick={remove}>
              Remove
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirm(true)}>
            Remove candidate
          </button>
        )}
      </div>

      {c.status !== 'done' && (
        <div className="card mt-8 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          {c.status === 'failed' ? (
            <>
              <p className="text-bad">Screening failed: {c.error}</p>
              <button type="button" className="btn" onClick={retry}>
                Try again
              </button>
            </>
          ) : (
            <p className="text-muted">This resume is being screened. The page updates on its own.</p>
          )}
        </div>
      )}

      {c.status === 'done' && <Report c={c} />}
    </>
  );
}

function Report({ c }) {
  const criteria = c.rubric.criteria;
  const p = c.profile;

  return (
    <>
      <section className="card mt-8 grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
        <div>
          <p className="text-sm text-muted">Match score</p>
          <p className="text-5xl font-medium tabular-nums tracking-tight">{fmtScore(c.score)}</p>
          <p className="mt-2 text-sm">
            <span className="text-muted">Must-haves: </span>
            <MustHave ok={c.meets_must} />
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-ink/90">{c.summary}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <List title="Strengths" items={c.strengths} />
            <List title="Gaps" items={c.gaps} />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">How the score was built</h2>
        <ul className="card divide-y divide-line">
          {criteria.map((cr) => {
            const r = c.ratings.find((x) => x.criterion === cr.name) ?? { score: 0, evidence: [], note: '' };
            return (
              <li key={cr.name} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <p className="font-medium">
                    {cr.name}
                    <span className="ml-2 text-sm font-normal text-muted">
                      weight {cr.weight}
                      {cr.mustHave ? ', must have' : ''}
                    </span>
                  </p>
                  <ScoreBar score={r.score} max={10} className="w-44" />
                </div>
                {r.note && <p className="mt-1 text-sm text-muted">{r.note}</p>}
                {r.evidence.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {r.evidence.map((q) => (
                      <li key={q} className="border-l-2 border-line pl-3 text-sm text-ink/85">
                        “{q}”
                      </li>
                    ))}
                  </ul>
                )}
                {r.unverified > 0 && (
                  <p className="mt-2 text-xs text-warn">
                    {r.unverified === 1 ? 'One quote was' : `${r.unverified} quotes were`} not found in the resume and did not count.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        <div className="card space-y-5 p-5">
          <p>
            {p.headline}
            {p.years != null && <span className="text-muted">. About {p.years} years of experience.</span>}
          </p>
          {p.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.skills.map((s) => (
                <span key={s} className="rounded-md border border-line bg-page px-2 py-0.5 text-sm">
                  {s}
                </span>
              ))}
            </div>
          )}
          {p.experience.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-muted">Experience</p>
              <ul className="space-y-1">
                {p.experience.map((e, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-x-4">
                    <span>
                      {e.title}, {e.org}
                    </span>
                    {e.period && <span className="text-sm text-muted">{e.period}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.education.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-muted">Education</p>
              <ul className="space-y-1">
                {p.education.map((e, i) => (
                  <li key={i}>
                    {e.degree}
                    {e.field ? `, ${e.field}` : ''}
                    {e.year ? <span className="text-sm text-muted"> ({e.year})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          Scoring used an anonymised copy of the resume. Name, contact details and links were removed first.
        </p>
      </section>
    </>
  );
}

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-muted">{title}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm marker:text-muted">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
