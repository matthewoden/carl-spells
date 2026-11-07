// The player's game preference (D&D or PF2E): scopes search, Surprise me and Another.
// Lives on the device only; opening someone's PF2E link doesn't change it.
import { useCallback, useEffect, useState } from 'react';
import { isGame, type Game } from './spells';

const KEY = 'carl-game';

export function getGame(): Game {
  try {
    const v = localStorage.getItem(KEY);
    return isGame(v) ? v : 'dnd';
  } catch {
    return 'dnd';
  }
}

export function useGame(): [Game, (g: Game) => void] {
  const [game, setState] = useState<Game>(getGame);

  // Another tab changed it: follow along.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setState(getGame());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const set = useCallback((g: Game) => {
    setState(g);
    try {
      localStorage.setItem(KEY, g);
    } catch {
      /* private mode: holds for this visit */
    }
  }, []);

  return [game, set];
}
