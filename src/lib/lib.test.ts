import { describe as group, expect, it } from 'vitest';
import { describe, diff } from './diff';
import { fitSize } from './fit';
import { recase } from './recase';
import { completion, search } from './search';
import { isNameSlug, nameFromSlug, slugify } from './slug';
import { findSpell, gameQuery, isShared, spellsFor } from './spells';
import { editorPath, ogPath, parseJoke, sharePath } from './share';

const line = (a: string, b: string) => describe(diff(a, b));
const marks = (a: string, b: string) =>
  [...b].map((c, i) => (diff(a, b).changed[i] ? c.toUpperCase() : c.toLowerCase())).join('');

group('diff', () => {
  it('names the single edit', () => {
    expect(line('Fireball', 'Fireball')).toBe('');
    expect(line('Fireball', 'Fireballs')).toBe('One letter added');
    expect(line('Fireball', 'Firebell')).toBe('One letter changed');
    expect(line('Web', 'We')).toBe('One letter removed');
    expect(line('Fly', 'Fyl')).toBe('Two letters swapped');
  });
  it('stays calm past one edit', () => {
    expect(line('Fireball', 'Fireballss')).toBe('Two letters changed');
    expect(line('Fireball', 'Snowball')).toBe('Four edits');
  });
  it('highlights only the edited letters', () => {
    expect(marks('Fireball', 'Fireballs')).toBe('fireballS');
    expect(marks('Protection from Evil and Good', 'Protection from Evil and Food')).toBe(
      'protection from evil and Food',
    );
    expect(marks('Fireball', 'Fireball')).toBe('fireball');
  });
  it('ignores case and apostrophe style', () => {
    expect(diff('Fireball', 'fireball').distance).toBe(0);
    expect(diff('Hunter’s Mark', "Hunter's Mark").distance).toBe(0);
  });
  it('counts punctuation as characters', () => {
    expect(line('Enlarge/Reduce', 'EnlargeReduce')).toBe('One letter removed');
  });
});

group('slug', () => {
  it('matches the build script', () => {
    for (const s of [...spellsFor('dnd'), ...spellsFor('pf2e')]) expect(slugify(s.name)).toBe(s.slug);
  });
  it('validates the joke segment', () => {
    expect(isNameSlug('fireballs')).toBe(true);
    expect(isNameSlug('')).toBe(false);
    expect(isNameSlug('a'.repeat(41))).toBe(false);
    expect(isNameSlug('<script>')).toBe(false);
  });
  it('restores capitals from the original', () => {
    expect(nameFromSlug('fireballs', 'Fireball')).toBe('Fireballs');
    expect(nameFromSlug('protection-from-evil-and-food', 'Protection from Evil and Good')).toBe(
      'Protection from Evil and Food',
    );
    expect(nameFromSlug('hunters-mask', 'Hunter’s Mark')).toBe('Hunter’s Mask');
    expect(nameFromSlug('enlargereduce', 'Enlarge/Reduce')).toBe('Enlargereduce');
  });
});

group('search', () => {
  it('ranks prefixes, then word prefixes', () => {
    const names = search('fir').map((s) => s.name);
    expect(names.slice(0, 2)).toEqual(['Fire Bolt', 'Fire Shield']);
    expect(names).toContain('Fireball');
    expect(names.indexOf('Wall of Fire')).toBeGreaterThan(names.indexOf('Fireball'));
    expect(names.length).toBeLessThanOrEqual(8);
  });
  it('tolerates typos and missing apostrophes', () => {
    expect(search('firebal')[0].name).toBe('Fireball');
    expect(search('hunters')[0].name).toBe('Hunter’s Mark');
    expect(search('firbal').map((s) => s.name)).toContain('Fireball');
  });
  it('ghost-completes only literal prefixes', () => {
    expect(completion('fir', findSpell('fireball'))).toBe('eball');
    expect(completion('wall', findSpell('fireball'))).toBe('');
  });
});

group('fit', () => {
  // Rough serif metric: 0.5em per character.
  const measure = (t: string) => t.length * 50;
  it('keeps short names at full size', () => {
    expect(fitSize('Fireball', 342, measure)).toBe(58);
  });
  it('shrinks for a long single word', () => {
    expect(fitSize('Prestidigitation', 342, measure)).toBeLessThan(58);
  });
  it('allows three lines before shrinking', () => {
    expect(fitSize('Protection from Evil and Good', 342, measure)).toBe(58);
  });
});

group('card', async () => {
  const glyphs = (await import('../data/glyphs.json')).default as Record<string, { glyphs: Record<string, { d: string }> }>;
  const { cardSvg, fitName } = await import('./card');
  it('has sane glyph coordinates (no numbers fused by rounding)', () => {
    for (const font of ['display700', 'display500', 'body400']) {
      for (const [ch, g] of Object.entries(glyphs[font].glyphs)) {
        const nums = (g.d.match(/-?\d+/g) ?? []).map(Number);
        expect(Math.max(0, ...nums.map(Math.abs)), `${font} ${ch}`).toBeLessThan(1300);
      }
    }
  });
  it('fits names to the card', () => {
    expect(fitName('Fireballs')).toEqual({ size: 168, lines: ['Fireballs'] });
    expect(fitName('Protection from Evil and Food').lines).toEqual(['Protection from', 'Evil and Food']);
    expect(fitName('We').size).toBe(168);
  });
  it('draws text as paths, never <text>', () => {
    const svg = cardSvg({ original: 'Fireball', name: 'Fireballs', levelLine: 'Level 3 · Evocation' });
    expect(svg).not.toMatch(/<text/);
    expect(svg).toContain('<path');
  });
});

group('recase', () => {
  // caret = where the cursor sits after the edit
  it('moves the capital onto a letter added at the front', () => {
    expect(recase('Fireball', 'sFireball', 1)).toBe('Sfireball');
    expect(recase('Fireball', 'SFireball', 1)).toBe('Sfireball');
    expect(recase('Fireball', 'FFireball', 1)).toBe('Ffireball');
    expect(recase('Wall of Fire', 'Wall of sFire', 9)).toBe('Wall of Sfire');
  });
  it('promotes the next letter when the first is deleted', () => {
    expect(recase('Fireball', 'ireball', 0)).toBe('Ireball');
    expect(recase('Hunter’s Mark', 'Hunter’s ark', 9)).toBe('Hunter’s Ark');
  });
  it('capitalises a replaced first letter', () => {
    expect(recase('Fireball', 'bireball', 1)).toBe('Bireball');
  });
  it('leaves lowercase words and mid-word edits alone', () => {
    expect(recase('Protection from Evil and Good', 'Protection from Evil sand Good', 22)).toBe(
      'Protection from Evil sand Good',
    );
    expect(recase('Fireball', 'Fireballs', 9)).toBe('Fireballs');
    expect(recase('Fireball', 'Firebll', 5)).toBe('Firebll');
    expect(recase('Fireball', ' Fireball', 1)).toBe(' Fireball');
  });
});

group('two games', () => {
  it('drops accents from slugs and restores them from the original', () => {
    expect(slugify('Déjà Vu')).toBe('deja-vu');
    expect(nameFromSlug('deja-vus', 'Déjà Vu')).toBe('Déjà Vus');
  });
  it('resolves shared names by preference and unique names by game', () => {
    expect(isShared('fireball')).toBe(true);
    expect(findSpell('fireball')?.line).toBe('Level 3 · Evocation');
    expect(findSpell('fireball', 'pf2e')?.line).toBe('Rank 3 · Arcane, Primal');
    expect(findSpell('force-barrage')?.game).toBe('pf2e'); // PF2E only, found even when preferring D&D
    expect(findSpell('hunters-mark', 'pf2e')?.game).toBe('dnd');
    expect(findSpell('electric-arc')?.line).toBe('Cantrip · Arcane, Primal');
    expect(findSpell('runic-weapon')?.line).toBe('Rank 1 · All traditions');
  });
  it('adds ?g= only where the game changes the spell line', () => {
    expect(gameQuery(findSpell('fireball', 'pf2e')!)).toBe('?g=pf2e');
    expect(gameQuery(findSpell('fireball', 'dnd')!)).toBe('');
    expect(gameQuery(findSpell('force-barrage')!)).toBe('');
    expect(sharePath(findSpell('fireball', 'pf2e')!, 'Fireballs')).toBe('/s/fireball/fireballs?g=pf2e');
    expect(editorPath(findSpell('fireball', 'pf2e')!, 'fireballs')).toBe('/spell/fireball?name=fireballs&g=pf2e');
    const joke = parseJoke('fireball', 'fireballs', 'pf2e')!;
    expect(joke.spell.line).toBe('Rank 3 · Arcane, Primal');
    expect(ogPath(joke)).toMatch(/^\/og\/fireball\/fireballs\.png\?v=\d+&g=pf2e$/);
    expect(parseJoke('fireball', 'fireballs', 'bogus')!.spell.game).toBe('dnd');
  });
  it('searches within one game', () => {
    expect(search('heal', 'pf2e')[0].name).toBe('Heal');
    expect(search('force bar', 'dnd').map((s) => s.name)).not.toContain('Force Barrage');
    expect(search('deja', 'pf2e')[0].name).toBe('Déjà Vu');
    expect(search('force bar', 'pf2e')[0].name).toBe('Force Barrage');
  });
});

group('spell list', async () => {
  const { groupSpells } = await import('./spellList');
  it('groups by first letter, A to Z and back', () => {
    const asc = groupSpells('dnd', 'letter', 'asc');
    expect(asc[0].title).toBe('A');
    expect(asc[0].spells[0].name).toBe('Acid Arrow');
    expect(asc.reduce((n, g) => n + g.spells.length, 0)).toBe(spellsFor('dnd').length);
    const desc = groupSpells('dnd', 'letter', 'desc');
    expect(desc[0].title).toBe(asc[asc.length - 1].title);
    expect(desc[desc.length - 1].spells.at(-1)!.name).toBe('Acid Arrow');
  });
  it('files accented names under the plain letter', () => {
    const d = groupSpells('pf2e', 'letter', 'asc').find((g) => g.title === 'D')!;
    expect(d.spells.map((s) => s.name)).toContain('Déjà Vu');
  });
  it('groups by level or rank, cantrips first or last', () => {
    const dnd = groupSpells('dnd', 'level', 'asc');
    expect(dnd.map((g) => g.title)).toEqual(['Cantrips', ...Array.from({ length: 9 }, (_, i) => `Level ${i + 1}`)]);
    expect(dnd.map((g) => g.mark)[0]).toBe('C');
    const pf = groupSpells('pf2e', 'level', 'desc');
    expect(pf[0].title).toBe('Rank 10');
    expect(pf.at(-1)!.title).toBe('Cantrips');
  });
  it('has a level-free detail line for rank/level grouping', () => {
    expect(findSpell('fireball', 'pf2e')!.detail).toBe('Arcane, Primal');
    expect(findSpell('fireball')!.detail).toBe('Evocation');
  });
});

group('casing in share links', () => {
  const forcecage = findSpell('forcecage')!;
  it("keeps the player's capitals when title-casing would lose them", () => {
    expect(sharePath(forcecage, 'ForceMage')).toBe('/s/forcecage/ForceMage');
    expect(parseJoke('forcecage', 'ForceMage')!.name).toBe('ForceMage');
    expect(parseJoke('forcecage', 'ForceMage')!.status).toBe('one letter changed');
    expect(nameFromSlug('FIREBALLS', 'Fireball')).toBe('FIREBALLS');
  });
  it('leaves ordinary links lowercase', () => {
    expect(sharePath(findSpell('fireball')!, 'Fireballs')).toBe('/s/fireball/fireballs');
    expect(sharePath(findSpell('hunters-mark')!, 'Hunter’s Mask')).toBe('/s/hunters-mark/hunters-mask');
    expect(sharePath(findSpell('protection-from-evil-and-good')!, 'Protection from Evil and Food')).toBe(
      '/s/protection-from-evil-and-good/protection-from-evil-and-food',
    );
  });
  it('still reads old lowercase links the same way', () => {
    expect(parseJoke('forcecage', 'forcemage')!.name).toBe('Forcemage');
  });
});
