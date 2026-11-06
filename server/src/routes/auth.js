import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { one } from '../db.js';
import { endSession, requireAuth, startSession } from '../auth.js';
import { HttpError, parse } from '../http.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });

const email = z.string().trim().toLowerCase().email('Enter a valid email address.');

const Register = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  email,
  password: z.string().min(8, 'Use at least 8 characters for the password.').max(72),
});

const Login = z.object({ email, password: z.string().min(1, 'Enter your password.') });

router.post('/register', limiter, async (req, res) => {
  const body = parse(Register, req.body);
  const hash = await bcrypt.hash(body.password, 10);
  const user = await one(
    `insert into users (name, email, password_hash) values ($1, $2, $3)
     on conflict (email) do nothing returning id, name, email`,
    [body.name, body.email, hash],
  );
  if (!user) throw new HttpError(409, 'An account with this email already exists.');
  startSession(res, user.id);//signs a jwt and returns httponly cookie containing signed jwt to frontend.
  res.status(201).json(user);
});

router.post('/login', limiter, async (req, res) => {
  const body = parse(Login, req.body);
  const user = await one('select id, name, email, password_hash from users where email = $1', [body.email]);
  const ok = user && (await bcrypt.compare(body.password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Email or password is incorrect.');
  startSession(res, user.id);
  res.json({ id: user.id, name: user.name, email: user.email });
});

router.post('/logout', (req, res) => {
  endSession(res);
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await one('select id, name, email from users where id = $1', [req.userId]);
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  res.json(user);
});

export default router;
