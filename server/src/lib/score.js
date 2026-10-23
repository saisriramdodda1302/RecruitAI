export const MUST_MIN = 4;

const words = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//anonymise.
export function redact(text, { name, email, phone } = {}) {
  let out = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link]')
    .replace(/\b(?:linkedin\.com|github\.com)\/\S*/gi, '[link]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, (m) => (m.replace(/\D/g, '').length >= 10 ? '[phone]' : m));

  for (const value of [email, phone]) {
    if (value) out = out.split(value).join('[contact]');
  }

  const parts = (name || '').split(/\s+/).filter((p) => p.length >= 3);
  for (const part of parts) {
    out = out.replace(new RegExp(`\\b${escape(part)}\\b`, 'gi'), '[candidate]');
  }
  return out;
}

//evidence check.
export function verified(quotes, text) {
  const hay = words(text);
  return quotes.filter((q) => {
    const needle = words(q);
    return needle.length >= 4 && hay.includes(needle);
  });
}

export function settle(ratings, criteria, text) {
  return criteria.map((c) => {
    const r = ratings.find((x) => words(x.criterion) === words(c.name));
    if (!r) return { criterion: c.name, score: 0, evidence: [], note: 'Not assessed.', unverified: 0 };

    const quotes = r.evidence.slice(0, 3);
    const evidence = verified(quotes, text);
    const unverified = quotes.length - evidence.length;
    let score = Math.max(0, Math.min(10, Math.round(r.score)));
    if (!evidence.length) score = quotes.length ? Math.min(score, 3) : 0;

    return { criterion: c.name, score, evidence, note: r.note, unverified };
  });
}

//weighted score.
export function rank(ratings, criteria) {
  const total = criteria.reduce((sum, c) => sum + c.weight, 0);
  let earned = 0;
  let meetsMust = true;

  for (const c of criteria) {
    const s = ratings.find((r) => r.criterion === c.name)?.score ?? 0;
    earned += c.weight * s;
    if (c.mustHave && s < MUST_MIN) meetsMust = false;
  }

  const score = total ? Math.round((earned / (total * 10)) * 1000) / 10 : 0;
  return { score, meetsMust };
}
