import { GAME_INFO, type Game } from '../lib/spells';

/** Home footer: the short attribution for the current game (full text on About, via the ? in the corner). */
export function Footer({ game }: { game: Game }) {
  return (
    <footer className="footer">
      <p className="attribution">{GAME_INFO[game].attribution}</p>
    </footer>
  );
}
