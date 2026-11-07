import { Link } from 'react-router';
import { Header } from '../components/Header';

/** Unknown paths. */
export function NotFound() {
  return (
    <main className="page">
      <Header />
      <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
        No page here. <Link to="/">Find a spell</Link>.
      </p>
    </main>
  );
}
