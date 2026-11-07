// Extracts glyph outlines for the OG card into src/data/glyphs.json, so the card can be
// drawn as plain SVG paths: no font parsing or text shaping at request time, and the
// same output in the Worker (resvg) and the browser (canvas).
//
//   node data/build-glyphs.mjs
//
// Fonts are the same @fontsource Latin subsets the app self-hosts (SIL OFL).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontFile = (pkg, file) => join(root, 'node_modules/@fontsource', pkg, 'files', file);
const load = (path) => {
  const buf = readFileSync(path);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

// Printable ASCII, ’ and ·, plus Latin-1 letters for originals like "Déjà Vu" (the joke
// arrives as an [a-z0-9'-] slug, but words it shares with the original keep their accents).
const CHARSET = [
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  '\u2019',
  '\u00b7',
  ...Array.from({ length: 64 }, (_, i) => String.fromCharCode(0xc0 + i)).filter((c) => c !== '\u00d7' && c !== '\u00f7'),
];

const FONTS = {
  display700: fontFile('cormorant-garamond', 'cormorant-garamond-latin-700-normal.woff'),
  display500: fontFile('cormorant-garamond', 'cormorant-garamond-latin-500-normal.woff'),
  body400: fontFile('alegreya', 'alegreya-latin-400-normal.woff'),
};

// Keep a separator: "-0.3" rounds to "0" and would otherwise fuse with the number before it.
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => ` ${Math.round(Number(n))}`).replace(/([A-Za-z]) /g, '$1');

function extract(font, kerning) {
  const glyphs = {};
  for (const ch of CHARSET) {
    const g = font.charToGlyph(ch);
    if (!g || g.index === 0) continue;
    // Font units, y down from the baseline (opentype.js screen coordinates).
    glyphs[ch] = { w: Math.round(g.advanceWidth), d: round(g.getPath(0, 0, font.unitsPerEm).toPathData(2)) };
  }
  const kern = {};
  if (kerning) {
    for (const a of CHARSET) {
      for (const b of CHARSET) {
        if (!glyphs[a] || !glyphs[b]) continue;
        const k = font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b));
        if (k) kern[a + b] = k;
      }
    }
  }
  return { upm: font.unitsPerEm, ascender: font.ascender, descender: font.descender, glyphs, kern };
}

const out = {};
for (const [key, path] of Object.entries(FONTS)) out[key] = extract(load(path), key === 'display700');


const json = JSON.stringify(out);
writeFileSync(join(root, 'src/data/glyphs.json'), json + '\n');
console.log(
  `src/data/glyphs.json ${(json.length / 1024).toFixed(1)} KB; kerning pairs: ${Object.keys(out.display700.kern).length}`,
);
