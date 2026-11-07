import { useEffect, useRef, useState } from 'react';
import './CarlTiles.css';

// The C·A·R·L wordmark plays its own game. On every page load it opens as C R L and the
// A flips in as the "added" letter (coming back to home from inside the app skips it).
// After that, while the page sits idle, it casts a demo spell every 25s: change L to D
// ("dragons"), or add an S ("spells"), each undone a moment later. Reduced motion shows
// plain CARL.

interface Tile {
  id: string;
  letter: string;
  word: string;
  hl: boolean; // orchid: an added or changed letter
  turned: boolean; // edge-on, mid-flip
  collapsed: boolean; // zero width, sliding in or out
  quiet: boolean; // label faded while it changes
}

const FLIP = 420; // ms per half-turn; keep in step with CarlTiles.css
const SLIDE = 650; // ms for a column to open or close
const IDLE = 25_000; // quiet time before a demo spell
const HOLD = 2600; // how long a demo spell stays before it's undone

const t = (id: string, letter: string, word: string, extra: Partial<Tile> = {}): Tile => ({
  id, letter, word, hl: false, turned: false, collapsed: false, quiet: false, ...extra,
});
const CARL = [t('c', 'C', 'change'), t('a', 'A', 'add', { hl: true }), t('r', 'R', 'remove'), t('l', 'L', 'letters')];

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Module state: true after the intro has played once in this page load. A reload resets it.
let introPlayed = false;
const seenIntro = () => introPlayed;

/** `paused`: hold off demo spells (e.g. while the player is using search). */
export function CarlTiles({ paused = false }: { paused?: boolean }) {
  const [tiles, setTiles] = useState<Tile[]>(() =>
    reducedMotion() || seenIntro() ? CARL : CARL.filter((x) => x.id !== 'a'),
  );
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (reducedMotion()) return;
    let alive = true;
    let lastActivity = performance.now();
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const patch = (id: string, p: Partial<Tile>) => setTiles((ts) => ts.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    // Any interaction restarts the idle clock, so spells never cast under the player's thumb.
    const touch = () => (lastActivity = performance.now());
    const events = ['pointerdown', 'keydown', 'scroll', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    async function add(tile: Tile, index: number) {
      setTiles((ts) => [...ts.slice(0, index), { ...tile, collapsed: true, turned: true, hl: false }, ...ts.slice(index)]);
      await nextFrame();
      patch(tile.id, { collapsed: false });
      await wait(SLIDE * 0.6);
      patch(tile.id, { turned: false });
      await wait(FLIP + 200);
      if (tile.hl) patch(tile.id, { hl: true });
    }
    async function change(id: string, letter: string, word: string, hl: boolean) {
      patch(id, { turned: true, quiet: true, ...(hl ? {} : { hl: false }) });
      await wait(FLIP);
      patch(id, { letter, word, turned: false, quiet: false });
      await wait(FLIP + 150);
      if (hl) patch(id, { hl: true });
    }
    async function remove(id: string) {
      patch(id, { turned: true, quiet: true });
      await wait(FLIP);
      patch(id, { collapsed: true });
      await wait(SLIDE);
      setTiles((ts) => ts.filter((x) => x.id !== id));
    }

    async function run() {
      if (!seenIntro()) {
        await wait(700);
        if (!alive) return;
        await add(t('a', 'A', 'add', { hl: true }), 1);
        introPlayed = true;
      }
      lastActivity = performance.now();
      for (let n = 0; alive; n++) {
        // Wait for 25s of quiet with the page visible and search not in use.
        while (alive && (performance.now() - lastActivity < IDLE || pausedRef.current || document.hidden)) {
          if (pausedRef.current || document.hidden) lastActivity = performance.now();
          await wait(500);
        }
        if (!alive) return;
        if (n % 2 === 0) {
          await change('l', 'D', 'dragons', true); // CARD
          await wait(HOLD);
          if (alive) await change('l', 'L', 'letters', false);
        } else {
          await add(t('s', 'S', 'spells', { hl: true }), 4); // CARLS
          await wait(HOLD);
          if (alive) await remove('s');
        }
        lastActivity = performance.now();
      }
    }
    void run();

    return () => {
      alive = false;
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, []);

  return (
    <h1 className="tiles" aria-label="CARL: Change, Add, Remove Letters">
      {tiles.map((x) => (
        <span key={x.id} className="tile-col" data-collapsed={x.collapsed || undefined} aria-hidden="true">
          <span className="tile" data-hl={x.hl || undefined} data-turned={x.turned || undefined}>
            {x.letter}
          </span>
          <span className="tile-word" data-quiet={x.quiet || undefined}>
            {x.word}
          </span>
        </span>
      ))}
    </h1>
  );
}
