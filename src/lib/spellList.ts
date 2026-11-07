// Grouping and ordering for the /spells page. Pure, so it's tested directly.
import { GAME_INFO, spellsFor, type Game, type Spell } from './spells';

export type GroupBy = 'letter' | 'level';
export type SortDir = 'asc' | 'desc';

export interface Group {
  /** Stable anchor id, e.g. "g-A" or "g-3". */
  id: string;
  /** Heading: "A", "Cantrips", "Level 3", "Rank 10". */
  title: string;
  /** Jump-strip label: "A", "C" (cantrips), "3". */
  mark: string;
  spells: Spell[];
}

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
const byName = (a: Spell, b: Spell) => fold(a.name).localeCompare(fold(b.name), 'en', { sensitivity: 'base' });

export function groupSpells(game: Game, by: GroupBy, dir: SortDir): Group[] {
  const groups = new Map<string | number, Spell[]>();
  for (const s of spellsFor(game)) {
    const first = fold(s.name).charAt(0).toUpperCase();
    const key = by === 'letter' ? (/[A-Z]/.test(first) ? first : '#') : s.level;
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }
  const sign = dir === 'asc' ? 1 : -1;
  const keys = [...groups.keys()].sort((a, b) => sign * (typeof a === 'number' ? (a as number) - (b as number) : String(a).localeCompare(String(b))));
  return keys.map((k) => {
    const spells = groups.get(k)!.sort((a, b) => sign * byName(a, b));
    if (by === 'letter') return { id: `g-${k === '#' ? 'num' : k}`, title: String(k), mark: String(k), spells };
    const n = k as number;
    return {
      id: `g-${n}`,
      title: n === 0 ? 'Cantrips' : `${GAME_INFO[game].level} ${n}`,
      mark: n === 0 ? 'C' : String(n),
      spells,
    };
  });
}
