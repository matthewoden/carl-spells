import { useEffect } from 'react';

/** A quiet confirmation line ("Link copied"), announced to screen readers. */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className="toast" role="status" aria-live="polite" data-show={message ? '' : undefined}>
      {message}
    </div>
  );
}
