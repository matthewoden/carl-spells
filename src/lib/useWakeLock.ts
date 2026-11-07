import { useEffect, useState } from 'react';

/** Keep the screen on while mounted. Returns whether the lock is currently held. */
export function useWakeLock(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let live = true;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (!live) return void lock.release();
        setHeld(true);
        lock.addEventListener('release', () => live && setHeld(false));
      } catch {
        setHeld(false); // low battery mode, iframe, or not allowed: the screen just dims as usual
      }
    };
    // The browser drops the lock when the tab is hidden; take it back on return.
    const onVisible = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);

  return held;
}
