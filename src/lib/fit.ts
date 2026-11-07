// Fit-to-width for the big spell name: start at 58px and step down until the longest
// word fits the width and a greedy word wrap needs at most three lines.

export const MAX_SIZE = 58;
const MIN_SIZE = 24;
const MAX_LINES = 3;
const TRACKING = -0.01; // em, matches letter-spacing on the field

/** Width of `text` at `size` px. Supplied by the caller (canvas in the browser). */
export type Measure = (text: string) => number; // at 100px, no tracking

export function fitSize(text: string, width: number, measure: Measure): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length || width <= 0) return MAX_SIZE;
  const at100 = words.map((w) => measure(w) + TRACKING * 100 * [...w].length);
  const space = measure(' ');
  for (let size = MAX_SIZE; size > MIN_SIZE; size--) {
    const k = size / 100;
    if (Math.max(...at100) * k > width) continue;
    let lines = 1;
    let line = 0;
    for (const w of at100) {
      const add = line === 0 ? w * k : (space + w) * k;
      if (line > 0 && line + add > width) {
        lines++;
        line = w * k;
      } else {
        line += add;
      }
    }
    if (lines <= MAX_LINES) return size;
  }
  return MIN_SIZE;
}
