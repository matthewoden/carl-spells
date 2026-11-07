import { GAME_INFO, GAMES, type Game } from '../lib/spells';
import './GameToggle.css';

// docs/design/button-tip.svg, as HexButton draws it. Its .bg triangle fills on the active side.
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

/** The hex button split in two: which spell list search and shuffling draw from. */
export function GameToggle({ game, onChange }: { game: Game; onChange: (g: Game) => void }) {
  return (
    <div className="game-toggle">
      <div className="gt-bar" role="radiogroup" aria-label="Spell list" data-sel={game}>
        <span className="l" aria-hidden="true"><Tip /></span>
        <span className="r" aria-hidden="true"><Tip /></span>
        {GAMES.map((g, i) => (
          <span key={g} className="gt-cell">
            {i > 0 && <span className="gt-div" aria-hidden="true" />}
            <button
              type="button"
              role="radio"
              aria-checked={game === g}
              tabIndex={game === g ? 0 : -1}
              className="gt-seg"
              onClick={() => onChange(g)}
              onKeyDown={(e) => {
                // Radio-group keys: arrows move the selection.
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = GAMES[(GAMES.indexOf(g) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : GAMES.length - 1)) % GAMES.length];
                  onChange(next);
                  (e.currentTarget.closest('.gt-bar')?.querySelector(`[data-g="${next}"]`) as HTMLElement | null)?.focus();
                }
              }}
              data-g={g}
            >
              {GAME_INFO[g].short}
            </button>
          </span>
        ))}
      </div>
      <span className="gt-caption" aria-hidden="true">spell list</span>
    </div>
  );
}
