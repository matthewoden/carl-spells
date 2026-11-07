// Spell lookup for both games, shared by the app and the Worker. The data comes from
// data/build-spells.mjs (D&D) and data/build-pf2e.mjs (PF2E); never edit src/data/*.json.
//
// URLs carry only the spell slug. 338 slugs belong to one game; 70 exist in both, and for
// those the game decides only the spell line ("Level 3 · Evocation" vs "Rank 3 · Arcane,
// Primal"). The build guarantees a shared slug always means the same name.
import dnd from '../data/dnd.json';
import pf2e from '../data/pf2e.json';

export type Game = 'dnd' | 'pf2e';
export const GAMES: readonly Game[] = ['dnd', 'pf2e'];
export const isGame = (g: unknown): g is Game => g === 'dnd' || g === 'pf2e';

export interface Spell {
  game: Game;
  slug: string;
  name: string;
  /** D&D level or PF2E rank; 0 is a cantrip in both. */
  level: number;
  /** "Level 3 · Evocation", "Cantrip · Evocation", "Rank 3 · Arcane, Primal". */
  line: string;
  /** The line without the level: "Evocation", "Arcane, Primal". For lists grouped by level. */
  detail: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const dndSpells: Spell[] = (dnd.spells as [string, string, number, number][]).map(([slug, name, level, school]) => {
  const line = `${level === 0 ? 'Cantrip' : `Level ${level}`} · ${dnd.schools[school]}`;
  return { game: 'dnd', slug, name, level, line, detail: dnd.schools[school] };
});

const pf2eSpells: Spell[] = (pf2e.spells as [string, string, number, number][]).map(([slug, name, rank, mask]) => {
  const trads = pf2e.traditions.filter((_, i) => mask & (1 << i));
  const all = trads.length === pf2e.traditions.length;
  const tradLine = all ? 'All traditions' : trads.map(cap).join(', ');
  const lead = rank === 0 ? 'Cantrip' : `Rank ${rank}`;
  return { game: 'pf2e', slug, name, level: rank, line: `${lead} · ${tradLine}`, detail: tradLine };
});

const LISTS: Record<Game, Spell[]> = { dnd: dndSpells, pf2e: pf2eSpells };
const INDEX: Record<Game, Map<string, Spell>> = {
  dnd: new Map(dndSpells.map((s) => [s.slug, s])),
  pf2e: new Map(pf2eSpells.map((s) => [s.slug, s])),
};

export function spellsFor(game: Game): readonly Spell[] {
  return LISTS[game];
}

/** The spell for a slug, from `prefer` if it exists there, else from whichever game has it. */
export function findSpell(slug: string, prefer: Game = 'dnd'): Spell | undefined {
  const s = slug.toLowerCase();
  return INDEX[prefer].get(s) ?? INDEX[prefer === 'dnd' ? 'pf2e' : 'dnd'].get(s);
}

/** True when both games have this slug, so a link needs ?g= to pin the spell line. */
export function isShared(slug: string): boolean {
  return INDEX.dnd.has(slug) && INDEX.pf2e.has(slug);
}

/** "?g=pf2e" for a shared slug from PF2E; empty otherwise (D&D is the default). */
export function gameQuery(spell: Spell, sep: '?' | '&' = '?'): string {
  return isShared(spell.slug) && spell.game !== 'dnd' ? `${sep}g=${spell.game}` : '';
}

export const GAME_INFO: Record<
  Game,
  { short: string; placeholder: string; count: string; source: string; level: string; attribution: string }
> = {
  dnd: {
    short: 'D&D',
    placeholder: 'Fireball, Web, Hunter’s Mark…',
    count: `${dndSpells.length} spells from the SRD`,
    source: 'SRD 5.2.1',
    level: 'Level',
    attribution: 'Spell names from SRD 5.2.1, © Wizards of the Coast, used under CC-BY-4.0.',
  },
  pf2e: {
    short: 'PF2E',
    placeholder: 'Heal, Force Barrage, Electric Arc…',
    count: `${pf2eSpells.length} spells from Player Core`,
    source: 'Player Core 1 & 2',
    level: 'Rank',
    attribution: 'Spell names from Pathfinder Player Core 1 & 2, © Paizo Inc., used under the ORC License.',
  },
};

/** Verbatim attribution lines for the two Player Core books (ORC License, section 2). */
export const PF2E_ATTRIBUTION: readonly string[] = pf2e.attribution;
