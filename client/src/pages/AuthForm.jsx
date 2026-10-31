//signup(register/login).
// this -> uses lib's api to send reqst and then sets user after response from backend(lib/auth.js) in frontend lib -> then in backend routes/auth.js startSession()(startsession rerturning httponly cookie containing signed jwt).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { ThemeButton } from '../components/Shell';

export default function AuthForm({ mode }) {
  const isNew = mode === 'register';
  const { setUser } = useAuth();
  const [theme, toggle] = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = isNew ? form : { email: form.email, password: form.password };//register or login.
      setUser(await api(`/auth/${isNew ? 'register' : 'login'}`, { method: 'POST', body }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end p-4">
        <ThemeButton theme={theme} toggle={toggle} />
      </div>
      <main className="mx-auto w-full max-w-sm flex-1 px-5 pt-[8vh]">
        <h1 className="text-3xl font-medium tracking-tight">RecruitAI</h1>
        <p className="mt-2 text-muted">
          Screen resumes against one consistent rubric and get a ranked shortlist with evidence for every score.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          {isNew && (
            <div>
              <label htmlFor="name" className="label">
                Name
              </label>
              <input id="name" className="field" autoComplete="name" value={form.name} onChange={set('name')} />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">
              Work email
            </label>
            <input id="email" type="email" className="field" autoComplete="email" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field"
              autoComplete={isNew ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={set('password')}
            />
            {isNew && <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>}
          </div>

          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Please wait…' : isNew ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          {isNew ? 'Already have an account? ' : 'New here? '}
          <Link to={isNew ? '/login' : '/register'} className="text-accent hover:underline">
            {isNew ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </main>
    </div>
  );
}
