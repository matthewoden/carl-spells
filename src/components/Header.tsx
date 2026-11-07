import './Header.css';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CarlMark } from './CarlMark';

/**
 * "‹ Spells" header for the inner pages. `actions` go top right (the editor's Random);
 * wide screens also get the C·A·R·L tiles there, linking home.
 */
export function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header className="header">
      <Link to="/" className="back smallcaps">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Spells
      </Link>
      <div className="header-right">
        {actions}
        <CarlMark size="mini" className="header-mark" />
      </div>
    </header>
  );
}
