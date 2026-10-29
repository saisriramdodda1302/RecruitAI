import { query } from '../db.js';
import { screen } from './screen.js';

const limit = Number(process.env.SCREEN_CONCURRENCY) || 3;
const waiting = [];
const active = new Set();

function pump() {
  while (active.size < limit && waiting.length) {
    const id = waiting.shift();
    active.add(id);
    screen(id)
      .catch((err) => console.error(`screen ${id}:`, err))
      .finally(() => {
        active.delete(id);
        pump();
      });
  }
}

export function enqueue(...ids) {
  for (const id of ids) {
    if (!active.has(id) && !waiting.includes(id)) waiting.push(id);
  }
  pump();
}

export async function recover(jobId) {
  const { rows } = await query(
    `select id from candidates
     where status in ('queued', 'processing') and ($1::uuid is null or job_id = $1)
     order by created_at`,
    [jobId ?? null],
  );
  enqueue(...rows.map((r) => r.id));
  return rows.length;
}
