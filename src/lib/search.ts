// Client-side spell search: whole-name prefix matches first, then names with a word
// starting with the query ("fir" -> Wall of Fire), then Fuse.js fuzzy matches. Max 8.
import Fuse from 'fuse.js';
import { spellsFor, type Game, type Spell } from './spells';

const LIMIT = 8;
const norm = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

type Entry = { spell: Spell; key: string; words: string[] };
const indexes = new Map<Game, { indexed: Entry[]; fuse: Fuse<Entry> }>();

/** Built on first search per game, then reused. */
function indexFor(game: Game) {
  let idx = indexes.get(game);
  if (!idx) {
    const indexed = spellsFor(game).map((spell) => ({ spell, key: norm(spell.name), words: norm(spell.name).split(' ') }));
    idx = { indexed, fuse: new Fuse(indexed, { keys: ['key'], threshold: 0.4, ignoreLocation: true }) };
    indexes.set(game, idx);
  }
  return idx;
}

export function search(query: string, game: Game = 'dnd'): Spell[] {
  const { indexed, fuse } = indexFor(game);
  const q = norm(query);
  if (!q) return [];
  const prefix = indexed.filter((s) => s.key.startsWith(q));
  const word = indexed.filter((s) => !s.key.startsWith(q) && s.words.some((w) => w.startsWith(q)));
  const results = [...prefix, ...word].map((s) => s.spell);
  if (results.length < LIMIT) {
    const seen = new Set(results);
    for (const { item } of fuse.search(q)) {
      if (results.length >= LIMIT) break;
      if (!seen.has(item.spell)) results.push(item.spell);
    }
  }
  return results.slice(0, LIMIT);
}

/**
 * Ghost completion: the rest of the top result's name, if the query is a literal prefix
 * of it (ignoring case and apostrophe style). "fir" + Fire Bolt -> "e Bolt".
 */
export function completion(query: string, top: Spell | undefined): string {
  if (!query || !top) return '';
  const fold = (s: string) => s.toLowerCase().replace(/’/g, "'");
  return fold(top.name).startsWith(fold(query)) ? top.name.slice(query.length) : '';
}

/** A random spell from `game`, never the same name as `except`. */
export function randomSpell(game: Game, except?: Spell): Spell {
  const list = spellsFor(game);
  let next: Spell;
  do next = list[Math.floor(Math.random() * list.length)];
  while (except && next.slug === except.slug);
  return next;
}
