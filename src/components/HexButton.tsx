import type { ReactNode } from 'react';
import { Link } from 'react-router';

// The button end cap from docs/design/button-tip.svg. Exact proportions; do not redraw.
function Tip() {
  return (
    <svg viewBox="0 0 28 32" aria-hidden="true">
      <path className="bg" d="M28 0.5L12 16L28 31.5Z" />
      <path d="M28 0.5L12 16L28 31.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="6.34" y="10.34" width="11.31" height="11.31" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(45 12 16)" />
      <rect x="13.17" y="13.17" width="5.66" height="5.66" fill="currentColor" transform="rotate(45 16 16)" />
    </svg>
  );
}

function Tips() {
  return (
    <>
      <span className="l" aria-hidden="true"><Tip /></span>
      <span className="r" aria-hidden="true"><Tip /></span>
    </>
  );
}

type Props = { children: ReactNode } & ({ to: string; onClick?: never } | { onClick: () => void; to?: never });

/** The only button shape: a 32px bar with Deco tips, 8px margin for a 48px tap target. */
export function HexButton({ children, to, onClick }: Props) {
  if (to !== undefined) {
    return (
      <Link className="hex" to={to}>
        <Tips />
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className="hex" onClick={onClick}>
      <Tips />
      {children}
    </button>
  );
}
