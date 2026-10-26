export const fmtScore = (n) => (n == null ? '–' : Number(n).toFixed(1).replace(/\.0$/, ''));

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const tone = (score) => (score >= 70 ? 'bg-good' : score >= 45 ? 'bg-warn' : 'bg-bad');
