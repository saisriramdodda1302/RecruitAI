import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDate, fmtScore } from '../lib/format';

export default function Jobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api('/jobs')
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-1 text-muted">Each job gets its own rubric and ranked list of candidates.</p>
        </div>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New job
          </button>
        )}
      </div>

      {creating && <NewJob onCancel={() => setCreating(false)} />}
      {error && <p className="mt-6 text-bad">{error}</p>}

      {jobs && !jobs.length && !creating && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-medium">No jobs yet</p>
          <p className="mt-1 text-muted">Create a job and paste its description. RecruitAI turns it into a scoring rubric.</p>
        </div>
      )}

      {jobs?.length > 0 && (
        <ul className="card mt-8 divide-y divide-line overflow-hidden">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link to={`/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 hover:bg-line/30">
                <div className="min-w-0">
                  <p className="truncate font-medium">{j.title}</p>
                  <p className="text-sm text-muted">Created {fmtDate(j.created_at)}</p>
                </div>
                <div className="flex gap-6 text-sm text-muted">
                  <span>
                    {j.screened} of {j.total} screened
                  </span>
                  <span className="w-44 text-right">
                    {j.rubric_status === 'failed'
                      ? 'Rubric failed'
                      : j.top != null
                        ? `Best match ${fmtScore(j.top)}`
                        : j.screened
                          ? 'No one meets must-haves'
                          : 'Nothing screened yet'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NewJob({ onCancel }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const job = await api('/jobs', { method: 'POST', body: { title, description } });
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-5" noValidate>
      <div>
        <label htmlFor="title" className="label">
          Role title
        </label>
        <input id="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Backend Engineer" />
      </div>
      <div>
        <label htmlFor="description" className="label">
          Job description
        </label>
        <textarea
          id="description"
          rows={10}
          className="field resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the full description, including required and preferred skills."
        />
        <p className="mt-1.5 text-xs text-muted">
          Requirements marked as required or mandatory become must-haves in the rubric.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Building rubric…' : 'Create job'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
