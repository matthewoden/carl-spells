import './Header.css';
import { Link } from 'react-router';

/** "‹ Spells" header used by the editor and About. */
export function Header() {
  return (
    <header className="header">
      <Link to="/" className="back smallcaps">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Spells
      </Link>
    </header>
  );
}
