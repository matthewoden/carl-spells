import { Link } from 'react-router';
import './CarlMark.css';

const LETTERS = [
  ['C', 'change'],
  ['A', 'add'],
  ['R', 'remove'],
  ['L', 'letters'],
] as const;

/**
 * The C·A·R·L tiles as a static link home: `full` (with the four words, as on the home
 * page) or `mini` (tiles only, for a page header). Same drawing as CarlTiles, no motion.
 * worker/share.ts writes the same markup for the server-rendered share page.
 */
export function CarlMark({ size = 'full', className = '' }: { size?: 'full' | 'mini'; className?: string }) {
  return (
    // Named by hidden text rather than aria-label, so the visible words never conflict with
    // the spoken name (WCAG 2.5.3); the tiles themselves are hidden from screen readers.
    <Link to="/" className={`carl-mark carl-mark-${size} ${className}`.trim()}>
      <span className="sr-only">CARL, home</span>
      {LETTERS.map(([l, w]) => (
        <span key={l} className="cm-col" aria-hidden="true">
          <span className="cm-tile" data-hl={l === 'A' || undefined}>
            {l}
          </span>
          {size === 'full' && <span className="cm-word">{w}</span>}
        </span>
      ))}
    </Link>
  );
}
