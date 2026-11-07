import { useEffect } from 'react';
import { Tips } from './HexButton';

/**
 * A quiet confirmation ("Link copied") in the hex-button shape, announced to screen
 * readers. It sits just above the buttons that triggered it (see .toast-anchor).
 */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className="toast" role="status" aria-live="polite" data-show={message ? '' : undefined}>
      {message && <Tips />}
      {message}
    </div>
  );
}
