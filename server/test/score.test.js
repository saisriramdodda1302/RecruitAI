import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rank, redact, settle, verified } from '../src/lib/score.js';

const criteria = [
  { name: 'React', weight: 3, mustHave: true },
  { name: 'PostgreSQL', weight: 2, mustHave: false },
  { name: 'System design', weight: 1, mustHave: false },
];

const resume = `Asha Verma
asha.verma@mail.com | +91 98765 43210 | github.com/ashav
Software Engineer, 2021 - 2024
Built a React dashboard used by 40 support agents.
Designed PostgreSQL schemas and indexes for billing.`;

test('redact removes contact details and the name, keeps dates', () => {
  const out = redact(resume, { name: 'Asha Verma' });
  assert.ok(!/asha|verma|@|98765/i.test(out));
  assert.ok(out.includes('2021 - 2024'));
  assert.ok(out.includes('[candidate]') && out.includes('[email]') && out.includes('[phone]'));
});

test('quotes must appear in the resume text', () => {
  const quotes = ['Built a React dashboard', 'Led a team of 50 engineers'];
  assert.deepEqual(verified(quotes, resume), ['Built a React dashboard']);
});

test('settle zeroes unsupported scores and caps unverifiable ones', () => {
  const ratings = settle(
    [
      { criterion: 'react', score: 8, evidence: ['Built a React dashboard used by 40 support agents.'], note: '' },
      { criterion: 'PostgreSQL', score: 9, evidence: ['Ran Postgres at Google scale'], note: '' },
      { criterion: 'System design', score: 6, evidence: [], note: '' },
    ],
    criteria,
    resume,
  );
  assert.deepEqual(
    ratings.map((r) => r.score),
    [8, 3, 0],
  );
  assert.equal(ratings[1].unverified, 1);
});

test('rank weights scores and gates on must-haves', () => {
  const strong = [
    { criterion: 'React', score: 8 },
    { criterion: 'PostgreSQL', score: 5 },
    { criterion: 'System design', score: 2 },
  ];
  assert.deepEqual(rank(strong, criteria), { score: 60, meetsMust: true });

  const weak = strong.map((r) => (r.criterion === 'React' ? { ...r, score: 3 } : r));
  assert.equal(rank(weak, criteria).meetsMust, false);
});

test('a missing criterion counts as zero', () => {
  const out = settle([], criteria, resume);
  assert.ok(out.every((r) => r.score === 0));
});
