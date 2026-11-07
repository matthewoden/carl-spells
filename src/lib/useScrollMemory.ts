import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

// Scroll handling for the whole app: a new page opens at the top; Back/Forward returns to
// where you were (so leaving the spell list for the editor and coming back keeps your place).
//
// Scroll events only track the latest position. It's filed under a history entry at the
// moment the player leaves it, so a scroll event that arrives late (e.g. from the reset to
// the top of the next page) can never overwrite the position of the page that was left.
const positions = new Map<string, number>();

export function useScrollMemory() {
  const location = useLocation();
  const type = useNavigationType();
  const lastY = useRef(0);
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    history.scrollRestoration = 'manual';
    const track = () => (lastY.current = window.scrollY);
    window.addEventListener('scroll', track, { passive: true });
    return () => window.removeEventListener('scroll', track);
  }, []);

  useLayoutEffect(() => {
    if (prevKey.current !== null && prevKey.current !== location.key) positions.set(prevKey.current, lastY.current);
    prevKey.current = location.key;
    // In-place replacements (the list's controls, the editor saving its draft) keep the
    // current scroll; the entry simply carries it forward under its new key.
    if (type === 'REPLACE') return;
    const y = type === 'POP' ? (positions.get(location.key) ?? 0) : 0;
    window.scrollTo(0, y);
    lastY.current = y;
  }, [location.key, type]);
}
