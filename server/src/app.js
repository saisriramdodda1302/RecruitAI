import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import auth from './routes/auth.js';
import jobs from './routes/jobs.js';
import candidates from './routes/candidates.js';
import { pool } from './db.js';

export const app = express();

app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  await pool.query('select 1');
  res.json({ ok: true });
});

app.use('/api/auth', auth);
app.use('/api/jobs', jobs);
app.use('/api/candidates', candidates);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be under 5 MB.' : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err.code === '22P02') return res.status(404).json({ error: 'Not found.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});
