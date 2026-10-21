import { Link, Outlet } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

export default function Shell() {
  const { user, logout } = useAuth();
  const [theme, toggle] = useTheme();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-page/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5">
          <Link to="/" className="font-semibold tracking-tight">
            RecruitAI
          </Link>
          <div className="flex items-center gap-2">
            <span className="mr-1 hidden text-sm text-muted sm:inline">{user.name}</span>
            <ThemeButton theme={theme} toggle={toggle} />
            <button type="button" onClick={logout} className="btn h-9 px-3" title="Sign out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8">
        <Outlet />
      </main>
    </div>
  );
}

export function ThemeButton({ theme, toggle }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
