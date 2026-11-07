import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

// Scroll handling for the whole app: a new page opens at the top; Back/Forward returns to
// where you were (so leaving the spell list for the editor and coming back keeps your place).
const positions = new Map<string, number>();

export function useScrollMemory() {
  const location = useLocation();
  const type = useNavigationType();

  useEffect(() => {
    history.scrollRestoration = 'manual';
    const save = () => positions.set(location.key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [location.key]);

  useLayoutEffect(() => {
    // Query-only changes (the list's own controls) replace in place: leave scroll alone.
    if (type === 'REPLACE') return;
    window.scrollTo(0, type === 'POP' ? (positions.get(location.key) ?? 0) : 0);
  }, [location.key, location.pathname, type]);
}
