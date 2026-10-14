import { Link } from 'react-router-dom';
import ScoreBar from './ScoreBar';
import MustHave from './MustHave';

const STATUS = { queued: 'Waiting', processing: 'Screening…', failed: 'Failed' };

export default function Ranking({ candidates }) {
  if (!candidates.length) {
    return <p className="card px-5 py-8 text-center text-muted">No resumes yet. Add some above to start screening.</p>;
  }

  const ranks = new Map(candidates.filter((c) => c.status === 'done').map((c, i) => [c.id, i + 1]));
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left">
        <thead className="border-b border-line text-sm text-muted">
          <tr>
            <th className="w-12 px-5 py-3 font-medium">#</th>
            <th className="px-2 py-3 font-medium">Candidate</th>
            <th className="w-48 px-2 py-3 font-medium">Score</th>
            <th className="w-32 whitespace-nowrap px-5 py-3 font-medium">Must-haves</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {candidates.map((c) => {
            const done = c.status === 'done';
            return (
              <tr key={c.id} className="hover:bg-line/30">
                <td className="px-5 py-3 align-top tabular-nums text-muted">{ranks.get(c.id) ?? ''}</td>
                <td className="max-w-0 px-2 py-3">
                  <Link to={`/candidates/${c.id}`} className="font-medium hover:text-accent">
                    {c.name || c.file_name}
                  </Link>
                  <p className="truncate text-sm text-muted" title={c.error || c.summary || ''}>
                    {done ? c.summary : c.status === 'failed' ? c.error : c.file_name}
                  </p>
                </td>
                <td className="px-2 py-3">
                  {done ? (
                    <ScoreBar score={c.score} />
                  ) : (
                    <span className={`text-sm ${c.status === 'failed' ? 'text-bad' : 'text-muted'}`}>{STATUS[c.status]}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <MustHave ok={done ? c.meets_must : null} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
