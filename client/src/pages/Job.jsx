import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDate } from '../lib/format';
import { usePoll } from '../lib/usePoll';
import Rubric from '../components/Rubric';
import Upload from '../components/Upload';
import Ranking from '../components/Ranking';

export default function Job() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(
    () =>
      api(`/jobs/${id}`)
        .then(setJob)
        .catch((err) => setError(err.message)),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const pending = job?.candidates.some((c) => c.status === 'queued' || c.status === 'processing');
  usePoll(load, pending);

  const retry = async () => {
    setRetrying(true);
    await api(`/jobs/${id}/rubric/retry`, { method: 'POST' }).catch((err) => setError(err.message));
    await load();
    setRetrying(false);
  };

  const remove = async () => {
    await api(`/jobs/${id}`, { method: 'DELETE' });
    navigate('/');
  };

  if (error && !job) return <p className="text-bad">{error}</p>;
  if (!job) return <p className="text-muted">Loading…</p>;

  const screened = job.candidates.filter((c) => c.status === 'done').length;

  return (
    <>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All jobs
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Created {fmtDate(job.created_at)}. {screened} of {job.candidates.length} resumes screened.
          </p>
        </div>
        {confirm ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Delete this job and its candidates?</span>
            <button type="button" className="btn border-bad text-bad" onClick={remove}>
              Delete
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirm(true)}>
            Delete job
          </button>
        )}
      </div>

      <details className="mt-5 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Job description</summary>
        <p className="mt-3 whitespace-pre-line text-ink/85">{job.description}</p>
      </details>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Rubric</h2>
        <p className="mb-4 text-sm text-muted">
          Built from the job description. Every resume is scored 0 to 10 on each criterion, then weighted into a score out of 100.
        </p>
        {job.rubric_status === 'ready' && <Rubric key={JSON.stringify(job.rubric)} job={job} onChange={load} />}
        {job.rubric_status === 'pending' && <p className="card px-5 py-6 text-muted">Building the rubric…</p>}
        {job.rubric_status === 'failed' && (
          <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-bad">The rubric could not be generated.</p>
            <button type="button" className="btn" onClick={retry} disabled={retrying}>
              {retrying ? 'Trying again…' : 'Try again'}
            </button>
          </div>
        )}
      </section>

      {job.rubric_status === 'ready' && (
        <>
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Add resumes</h2>
            <Upload jobId={job.id} onDone={load} />
          </section>

          <section className="mt-10">
            <h2 className="mb-1 text-lg font-semibold">Ranking</h2>
            <p className="mb-4 text-sm text-muted">
              Candidates who meet every must-have come first, then by score.
            </p>
            <Ranking candidates={job.candidates} />
          </section>
        </>
      )}
    </>
  );
}
