import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CarlTiles } from '../components/CarlTiles';
import { Footer } from '../components/Footer';
import { GameToggle } from '../components/GameToggle';
import { HexButton } from '../components/HexButton';
import { completion, randomSpell, search } from '../lib/search';
import { useGame } from '../lib/game';
import { GAME_INFO, gameQuery } from '../lib/spells';
import './Home.css';


export function Home() {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Arrow keys move between the search box and the suggestions (which stay real links, so
  // Enter opens one and screen readers announce each). Up from the first returns to the box.
  const links = () => [...(listRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
  function onListKey(e: React.KeyboardEvent) {
    const all = links();
    const i = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      all[Math.min(i + 1, all.length - 1)].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i === 0) inputRef.current?.focus();
      else all[i - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }
  const [game, setGame] = useGame();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  // No demo spells while the player is searching.
  const searching = focused || query.trim() !== '';
  const results = useMemo(() => search(query, game), [query, game]);
  const info = GAME_INFO[game];
  const ghost = completion(query, results[0]);

  useEffect(() => {
    document.title = 'CARL · Change, Add, Remove Letters';
  }, []);

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (results[0]) navigate(`/spell/${results[0].slug}${gameQuery(results[0])}`);
  }

  return (
    <main className="page home">
      <Link to="/about" className="about-link" aria-label="About CARL">
        {/* Hairline circle with a question mark, in the frame colour. */}
        <svg aria-hidden="true" viewBox="0 0 28 28" width="28" height="28">
          <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <span aria-hidden="true">?</span>
      </Link>
      <div className="mark">
        <CarlTiles paused={searching} />
        <GameToggle game={game} onChange={setGame} />
      </div>

      <form role="search" onSubmit={go}>
        <span id={`${listId}-hint`} className="sr-only">Use the down arrow to move through suggestions.</span>
        <label htmlFor="q" className="smallcaps find">Find a spell</label>
        <div className="searchbox">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <div className="q-wrap">
            {/* Typed text is invisible here and visible in the input; the ghost sits after it. */}
            <div className="q-ghost" aria-hidden="true">
              <span className="q-typed">{query}</span>
              {ghost}
            </div>
            <input
              id="q"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              ref={inputRef}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && results.length) {
                  e.preventDefault();
                  links()[0]?.focus();
                }
              }}
              placeholder={info.placeholder}
              inputMode="search"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-controls={query.trim() ? listId : undefined}
              aria-describedby={`${listId}-hint`}
            />
          </div>
          {results.length > 0 && (
            <button type="submit" className="go smallcaps" aria-label={`Go to ${results[0].name}`}>
              go ↵
            </button>
          )}
        </div>
      </form>

      {query.trim() ? (
        <ul className="results" id={listId} ref={listRef} onKeyDown={onListKey} aria-label="Suggestions">
          {results.map((s) => (
            <li key={s.slug}>
              <Link to={`/spell/${s.slug}${gameQuery(s)}`}>
                <span className="r-name">{s.name}</span>
                <span className="r-meta smallcaps">{s.line}</span>
              </Link>
            </li>
          ))}
          {results.length === 0 && <li className="none">No spell by that name. Try fewer letters.</li>}
        </ul>
      ) : (
        <>
          <div className="surprise">
            <span className="hair" />
            <HexButton
              onClick={() => {
                const s = randomSpell(game);
                navigate(`/spell/${s.slug}${gameQuery(s)}`);
              }}
            >
              Surprise me
            </HexButton>
            <span className="hair" />
          </div>
          <p className="hint">
            Type a few letters, or let the dice choose.
            <br />
            <Link to={`/spells?g=${game}`}>{info.count}</Link>, all in one list.
          </p>
        </>
      )}

      <div className="spacer" />
      <Footer game={game} />
    </main>
  );
}
