import { one, query } from '../db.js';
import { ask } from './llm.js';
import { profilePrompt, reviewPrompt, rubricPrompt } from './prompts.js';
import { rank, redact, settle } from './score.js';

const run = (prompt, input) =>
  ask({ name: prompt.name, system: prompt.system, user: prompt.user(input), schema: prompt.schema });

const short = (err) => String(err?.message || err).slice(0, 300);

export async function buildRubric(job) {
  const { criteria } = await run(rubricPrompt, job);
  const seen = new Set();
  return {
    criteria: criteria.slice(0, 8).map((c) => {
      let name = c.name.trim();
      while (seen.has(name.toLowerCase())) name += ' (2)';
      seen.add(name.toLowerCase());
      return { ...c, name, weight: Math.max(1, Math.min(5, Math.round(c.weight))) };
    }),
  };
}

export async function screen(id) {
  const c = await one(
    `update candidates set status = 'processing', updated_at = now()
     where id = $1 and status in ('queued', 'processing') returning *`,
    [id],
  );
  if (!c) return;

  const job = await one('select title, description, rubric, rubric_status from jobs where id = $1', [c.job_id]);
  if (job?.rubric_status !== 'ready') {
    await query(`update candidates set status = 'queued' where id = $1`, [id]);
    return;
  }

  try {
    const { criteria } = job.rubric;
    const profile = await run(profilePrompt, c.resume);
    const text = redact(c.resume, profile);
    const review = await run(reviewPrompt, { job, criteria, profile, text });
    const ratings = settle(review.ratings, criteria, text);
    const { score, meetsMust } = rank(ratings, criteria);
    const { name, email, phone, ...facts } = profile;

    await query(
      `update candidates set status = 'done', error = null, name = $2, email = $3, phone = $4,
         profile = $5, ratings = $6, summary = $7, strengths = $8, gaps = $9,
         score = $10, meets_must = $11, updated_at = now()
       where id = $1`,
      [
        id,
        name,
        email,
        phone,
        facts,
        JSON.stringify(ratings),
        review.summary,
        JSON.stringify(review.strengths.slice(0, 4)),
        JSON.stringify(review.gaps.slice(0, 4)),
        score,
        meetsMust,
      ],
    );
  } catch (err) {
    await query(
      `update candidates set status = 'failed', error = $2, updated_at = now() where id = $1`,
      [id, short(err)],
    );
  }
}

export async function rescore(client, jobId, criteria) {
  const { rows } = await client.query(
    `select id, ratings from candidates where job_id = $1 and status = 'done'`,
    [jobId],
  );
  for (const row of rows) {
    const { score, meetsMust } = rank(row.ratings, criteria);
    await client.query('update candidates set score = $2, meets_must = $3 where id = $1', [
      row.id,
      score,
      meetsMust,
    ]);
  }
  return rows.length;
}
