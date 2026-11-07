// Line breaking for show-my-screen: try 1–3 lines, each the most even word split, and
// keep whichever lets the name be biggest in the given box. Fit is by font size only.

export interface Wrap {
  lines: string[];
  /** Widest line at 100px, tracking included. */
  width: number;
}

const TRACKING = -0.01; // em, matches the app's display letter-spacing
export const PITCH = 0.95; // line pitch in em
export const DESCENT = 0.3; // room under the last baseline, em

function splits(words: string[], n: number): string[][] {
  if (n === 1) return [[words.join(' ')]];
  const out: string[][] = [];
  for (let i = 1; i <= words.length - n + 1; i++) {
    for (const rest of splits(words.slice(i), n - 1)) out.push([words.slice(0, i).join(' '), ...rest]);
  }
  return out;
}

export function bestWrap(name: string, measure: (t: string) => number, boxW: number, boxH: number): Wrap {
  const words = name.split(/\s+/).filter(Boolean);
  const lineW = (t: string) => measure(t) + TRACKING * 100 * [...t].length;
  let best: Wrap & { size: number } = { lines: [name], width: lineW(name), size: 0 };
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    for (const lines of splits(words, n)) {
      const width = Math.max(...lines.map(lineW));
      const height = (PITCH * (n - 1) + 1 + DESCENT) * 100;
      const size = Math.min(boxW / width, boxH / height);
      if (size > best.size + 1e-6) best = { lines, width, size };
    }
  }
  return { lines: best.lines, width: best.width };
}
