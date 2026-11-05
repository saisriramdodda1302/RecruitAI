import { Router } from 'express';
import multer from 'multer';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { one, query, tx } from '../db.js';
import { requireAuth } from '../auth.js';
import { HttpError, parse } from '../http.js';
import { readResume } from '../lib/parse.js';
import { buildRubric, rescore } from '../lib/screen.js';
import { enqueue, recover } from '../lib/queue.js';

const router = Router();
router.use(requireAuth);

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024, files: 10 } });

const NewJob = z.object({
  title: z.string().trim().min(3, 'Give the role a title.').max(120),
  description: z
    .string()
    .trim()
    .min(80, 'Paste the full job description (at least 80 characters).')
    .max(8000, 'Keep the job description under 8000 characters.'),
});

const RubricEdit = z.object({
  criteria: z
    .array(
      z.object({
        name: z.string(),
        weight: z.number().int().min(1).max(5),
        mustHave: z.boolean(),
      }),
    )
    .min(1),
});

async function ownJob(userId, id) {
  const job = await one('select * from jobs where id = $1 and user_id = $2', [id, userId]);
  if (!job) throw new HttpError(404, 'Job not found.');
  return job;
}

async function attachRubric(job) {
  try {
    const rubric = await buildRubric(job);
    return one(
      `update jobs set rubric = $2, rubric_status = 'ready' where id = $1 returning *`,
      [job.id, rubric],
    );
  } catch (err) {
    console.error('rubric:', err.message);
    return one(`update jobs set rubric_status = 'failed' where id = $1 returning *`, [job.id]);
  }
}

router.get('/', async (req, res) => {
  const { rows } = await query(
    `select j.id, j.title, j.rubric_status, j.created_at,
       count(c.id)::int as total,
       count(c.id) filter (where c.status = 'done')::int as screened,
       max(c.score) filter (where c.meets_must) as top
     from jobs j left join candidates c on c.job_id = j.id
     where j.user_id = $1
     group by j.id
     order by j.created_at desc`,
    [req.userId],
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const body = parse(NewJob, req.body);
  const job = await one(
    'insert into jobs (user_id, title, description) values ($1, $2, $3) returning *',
    [req.userId, body.title, body.description],
  );
  res.status(201).json(await attachRubric(job));
});

router.get('/:id', async (req, res) => {
  const job = await ownJob(req.userId, req.params.id);
  const { rows } = await query(
    `select id, file_name, name, status, error, score, meets_must, summary, created_at
     from candidates where job_id = $1
     order by meets_must desc nulls last, score desc nulls last, created_at`,
    [job.id],
  );
  res.json({ ...job, candidates: rows });
});

router.delete('/:id', async (req, res) => {
  await ownJob(req.userId, req.params.id);
  await query('delete from jobs where id = $1', [req.params.id]);
  res.status(204).end();
});

router.post('/:id/rubric/retry', async (req, res) => {
  const job = await ownJob(req.userId, req.params.id);
  if (job.rubric_status === 'ready') throw new HttpError(409, 'The rubric is already ready.');
  const updated = await attachRubric(job);
  if (updated.rubric_status === 'ready') await recover(job.id);
  res.json(updated);
});

router.patch('/:id/rubric', async (req, res) => {
  const job = await ownJob(req.userId, req.params.id);
  if (job.rubric_status !== 'ready') throw new HttpError(409, 'The rubric is not ready yet.');
  const { criteria: edits } = parse(RubricEdit, req.body);

  const current = job.rubric.criteria;
  const same =
    edits.length === current.length && current.every((c) => edits.some((e) => e.name === c.name));
  if (!same) throw new HttpError(400, 'Only weights and must-have flags can be changed.');

  const criteria = current.map((c) => {
    const e = edits.find((x) => x.name === c.name);
    return { ...c, weight: e.weight, mustHave: e.mustHave };
  });

  const updated = await tx(async (client) => {
    const { rows } = await client.query('update jobs set rubric = $2 where id = $1 returning *', [
      job.id,
      { criteria },
    ]);
    await rescore(client, job.id, criteria);
    return rows[0];
  });
  res.json(updated);
});

router.post('/:id/candidates', upload.array('files'), async (req, res) => {
  const job = await ownJob(req.userId, req.params.id);
  if (job.rubric_status !== 'ready') throw new HttpError(409, 'Wait for the rubric before adding resumes.');
  if (!req.files?.length) throw new HttpError(400, 'Choose at least one resume.');

  const added = [];
  const skipped = [];

  for (const file of req.files) {
    try {
      const text = await readResume(file);
      if (text.length < 200) throw new Error('No readable text found. Is it a scanned image?');
      const hash = createHash('sha256').update(text.toLowerCase()).digest('hex');
      const row = await one(
        `insert into candidates (job_id, file_name, text_hash, resume) values ($1, $2, $3, $4)
         on conflict (job_id, text_hash) do nothing returning id`,
        [job.id, file.originalname, hash, text],
      );
      if (row) added.push(row.id);
      else skipped.push({ file: file.originalname, reason: 'Already added to this job.' });
    } catch (err) {
      skipped.push({ file: file.originalname, reason: err.message });
    }
  }

  enqueue(...added);
  res.status(added.length ? 201 : 200).json({ added: added.length, skipped });
});

export default router;
