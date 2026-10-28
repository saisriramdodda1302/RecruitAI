import { Router } from 'express';
import { one, query } from '../db.js';
import { requireAuth } from '../auth.js';
import { HttpError } from '../http.js';
import { enqueue } from '../lib/queue.js';

const router = Router();
router.use(requireAuth);

async function ownCandidate(userId, id) {
  const c = await one(
    `select c.*, j.title as job_title, j.rubric
     from candidates c join jobs j on j.id = c.job_id
     where c.id = $1 and j.user_id = $2`,
    [id, userId],
  );
  if (!c) throw new HttpError(404, 'Candidate not found.');
  return c;
}

router.get('/:id', async (req, res) => {
  const { resume, text_hash, ...c } = await ownCandidate(req.userId, req.params.id);
  res.json(c);
});

router.post('/:id/retry', async (req, res) => {
  const c = await ownCandidate(req.userId, req.params.id);
  if (c.status !== 'failed') throw new HttpError(409, 'Only failed screenings can be retried.');
  await query(`update candidates set status = 'queued', error = null where id = $1`, [c.id]);
  enqueue(c.id);
  res.status(202).json({ id: c.id, status: 'queued' });
});

router.delete('/:id', async (req, res) => {
  const c = await ownCandidate(req.userId, req.params.id);
  await query('delete from candidates where id = $1', [c.id]);
  res.status(204).end();
});

export default router;
