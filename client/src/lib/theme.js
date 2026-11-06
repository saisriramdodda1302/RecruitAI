import { useState } from 'react';

const current = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function useTheme() {
  const [theme, setTheme] = useState(current);

  const toggle = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage blocked */
    }
    setTheme(next);
  };

  return [theme, toggle];
}
