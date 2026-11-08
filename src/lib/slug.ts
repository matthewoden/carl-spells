// URL slugs for spell names and for the player's new name in /s/:spell/:name.
// Must stay in step with slugify() in data/build-spells.mjs.

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Like slugify, but keeps capitals: the joke segment carries casing the player chose
 *  ("ForceMage") when the usual title-casing wouldn't reproduce it. */
export function slugifyCased(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The Worker's rule for the joke segment: 1–40 characters of [A-Za-z0-9'-]. */
export function isNameSlug(s: string): boolean {
  return /^[A-Za-z0-9'-]{1,40}$/.test(s);
}

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
/** A word as slugifyCased writes it: accents and apostrophes gone, casing kept. */
const plain = (w: string) => w.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '');
const key = (w: string) =>
  w.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '');

/**
 * Turn a name slug back into display text. Words that still match a word of the original
 * keep its spelling (capitals, apostrophes); new words are title-cased, small words kept
 * lowercase unless first. "protection-from-evil-and-food" -> "Protection from Evil and Food".
 * A word with any capital in the slug keeps exactly that casing ("ForceMage").
 */
export function nameFromSlug(slug: string, original: string): string {
  const originalWords = new Map<string, string>();
  for (const w of original.split(/[\s/]+/)) originalWords.set(key(w), w);
  return slug
    .split('-')
    .filter(Boolean)
    .map((w, i) => {
      const kept = originalWords.get(key(w));
      if (/[A-Z]/.test(w)) return kept && plain(kept) === w ? kept : w;
      if (kept) return kept;
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}
