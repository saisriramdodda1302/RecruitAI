import jwt from 'jsonwebtoken';

const COOKIE = 'rai_session';
const WEEK = 7 * 24 * 60 * 60 * 1000;

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax', //among 3 levels, lax, Strict, None(I chose lax bcoz, it has balanced level of sec).
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

export function startSession(res, userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { ...cookieOpts(), maxAge: WEEK });
}

export function endSession(res) {
  res.clearCookie(COOKIE, cookieOpts());
}

export function requireAuth(req, res, next) {
  try {
    req.userId = jwt.verify(req.cookies[COOKIE], process.env.JWT_SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in to continue.' });
  }
}
