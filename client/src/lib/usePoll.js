import { useEffect } from 'react';

export function usePoll(fn, active, ms = 2500) {
  useEffect(() => {
    if (!active) return;
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }, [fn, active, ms]);
}
