// Keep a word's leading capital on its first letter while the player edits:
//   "Fireball" + "s" typed at the front -> "Sfireball"  (not "sFireball")
//   "Fireball" with the F deleted        -> "Ireball"
//   "Fireball" with the F replaced by b  -> "Bireball"
// Only words whose first letter was a capital are touched, so "from"/"and" stay lowercase.
// Case never counts as an edit (see diff.ts), so this is purely about a clean display.

const isLetter = (c: string | undefined) => !!c && c.toLowerCase() !== c.toUpperCase();
const isUpper = (c: string | undefined) => isLetter(c) && c === c!.toUpperCase();

/**
 * @param prev  value before the input event
 * @param next  value the browser produced
 * @param caret selectionEnd in `next` after the edit (where typing happened), if known
 */
export function recase(prev: string, next: string, caret = next.length): string {
  // The unchanged tail is everything after the caret; the unchanged head is the common
  // prefix, capped by the caret so "FFireball" (F typed at the front) isn't misread.
  let tail = next.length - caret;
  if (tail < 0 || tail > prev.length || prev.slice(prev.length - tail) !== next.slice(caret)) tail = 0;
  let head = 0;
  const maxHead = Math.min(caret, prev.length - tail, next.length - tail);
  while (head < maxHead && prev[head] === next[head]) head++;

  const removed = prev.slice(head, prev.length - tail);
  const inserted = next.slice(head, next.length - tail);
  const atWordStart = head === 0 || next[head - 1] === ' ';
  if (!atWordStart || !isUpper(prev[head])) return next;

  const before = next.slice(0, head);
  const after = next.slice(head + inserted.length);

  if (inserted) {
    if (!isLetter(inserted[0])) return next;
    const lead = inserted[0].toUpperCase() + inserted.slice(1);
    // Pure insertion: the old capital now follows the new letter; lower it.
    const rest = removed === '' && after ? after[0].toLowerCase() + after.slice(1) : after;
    return before + lead + rest;
  }
  // Pure deletion of the word's first letter: promote the new first letter.
  if (removed && isLetter(after[0])) return before + after[0].toUpperCase() + after.slice(1);
  return next;
}
