// Edit distance between the original spell name and the player's version, plus which
// characters of the new name to paint in the accent colour. Optimal string alignment
// (restricted Damerau-Levenshtein): insert, delete, substitute, swap adjacent letters.
//
// Comparison ignores case and treats ' and ’ as the same character: the share URL is
// case-insensitive and iOS smart punctuation shouldn't count as an edit.

export type Op = 'add' | 'change' | 'remove' | 'swap';

export interface Diff {
  distance: number;
  ops: Op[];
  /** One flag per UTF-16 unit of the new name: true if that character is an edit. */
  changed: boolean[];
}

const norm = (c: string) => (c === '’' ? "'" : c.toLowerCase());

export function diff(original: string, next: string): Diff {
  const a = [...original].map(norm);
  const b = [...next].map(norm);
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array<number>(m + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) d[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && a[i - 1] !== b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  // Walk back from the end, preferring matches so unchanged letters stay ink.
  const changedCodePoints = new Array<boolean>(m).fill(false);
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      i--; j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      ops.push('change'); changedCodePoints[j - 1] = true; i--; j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      ops.push('add'); changedCodePoints[j - 1] = true; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push('remove'); i--;
    } else {
      ops.push('swap'); changedCodePoints[j - 1] = changedCodePoints[j - 2] = true; i -= 2; j -= 2;
    }
  }

  // Expand code-point flags to UTF-16 units so callers can slice the string directly.
  const changed: boolean[] = [];
  [...next].forEach((ch, k) => {
    for (let u = 0; u < ch.length; u++) changed.push(changedCodePoints[k]);
  });

  return { distance: d[n][m], ops: ops.reverse(), changed };
}

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** The calm line under the field. Empty at distance 0; never a warning. */
export function describe({ distance, ops }: Diff): string {
  if (distance === 0) return '';
  if (distance === 1) {
    switch (ops[0]) {
      case 'add': return 'One letter added';
      case 'change': return 'One letter changed';
      case 'remove': return 'One letter removed';
      case 'swap': return 'Two letters swapped';
    }
  }
  if (distance === 2) return 'Two letters changed';
  return `${WORDS[distance] ?? distance} edits`;
}
