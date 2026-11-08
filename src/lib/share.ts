// Everything the share page, the preview card and the Worker agree on about one joke.
import { describe, diff } from './diff';
import { isNameSlug, nameFromSlug, slugify, slugifyCased } from './slug';
import { findSpell, gameQuery, isGame, type Spell } from './spells';

/** Bump to re-render every preview image after a card design change. */
export const OG_VERSION = 3;

export interface Joke {
  spell: Spell;
  nameSlug: string;
  /** Display form, title-cased from the slug against the original's spelling. */
  name: string;
  /** "one letter added", lowercase for the small-caps line; empty when unchanged. */
  status: string;
}

/** `g` (from ?g=) only matters for the 70 names both games share; D&D otherwise. */
export function parseJoke(spellSlug: string, nameSlug: string, g?: string | null): Joke | undefined {
  const spell = findSpell(spellSlug, isGame(g) ? g : 'dnd');
  if (!spell || !isNameSlug(nameSlug)) return undefined;
  const name = nameFromSlug(nameSlug, spell.name);
  if (!name) return undefined;
  return { spell, nameSlug, name, status: describe(diff(spell.name, name)).toLowerCase() };
}

/** Slug for the joke segment; falls back to the spell's own slug if the name won't fit.
 *  Lowercase unless the player's capitals would be lost ("ForceMage" stays "ForceMage"),
 *  so ordinary links look the same as before. */
export function nameSlugFor(spell: Spell, name: string): string {
  const lower = slugify(name);
  const cased = slugifyCased(name);
  const slug = nameFromSlug(lower, spell.name) === nameFromSlug(cased, spell.name) ? lower : cased;
  return isNameSlug(slug) ? slug : spell.slug;
}

export const sharePath = (spell: Spell, name: string) => `/s/${spell.slug}/${nameSlugFor(spell, name)}${gameQuery(spell)}`;
export const screenPath = (spell: Spell, name: string) => `/screen/${spell.slug}/${nameSlugFor(spell, name)}${gameQuery(spell)}`;
export const editorPath = (spell: Spell, nameSlug?: string) =>
  `/spell/${spell.slug}${nameSlug ? `?name=${nameSlug}${gameQuery(spell, '&')}` : gameQuery(spell)}`;
export const ogPath = (j: Joke) => `/og/${j.spell.slug}/${j.nameSlug}.png?v=${OG_VERSION}${gameQuery(j.spell, '&')}`;
