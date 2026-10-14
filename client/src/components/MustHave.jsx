export default function MustHave({ ok }) {
  if (ok == null) return <span className="text-muted">–</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${ok ? 'text-good' : 'text-bad'}`}
      title={ok ? 'Meets every must-have requirement' : 'Falls short on at least one must-have'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-good' : 'bg-bad'}`} />
      {ok ? 'Met' : 'Missing'}
    </span>
  );
}
