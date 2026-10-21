import { fmtScore, tone } from '../lib/format';

export default function ScoreBar({ score, max = 100, className = '' }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className={`h-full rounded-full ${tone(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm tabular-nums">
        {fmtScore(score)}
        {max !== 100 && <span className="text-muted">/{max}</span>}
      </span>
    </div>
  );
}
