// The 1200x630 preview card as an SVG string, with all text drawn as glyph outlines from
// src/data/glyphs.json. Used by the Worker (rasterised with resvg) and the browser
// (rasterised on a canvas); no fonts are needed at render time and output is identical.
//
// Layout follows docs/design/mockups/OgCard.dc.html, anchored to its render for a
// one-line 168px name. Theme is dark always (plan: the plum card stands out in feeds).
// The background is flat: the dark theme's radial lift tripled resvg's raster time
// (3.4ms vs 12.7ms at 1200px) for a 40px margin nobody would notice.
import glyphData from '../data/glyphs.json';
import { diff } from './diff';
import { ORNAMENT_R, ornamentShapes } from './ornament';

// Layout is drawn in 1200x630 units (the mockup's coordinates); the image is output at
// half that. 600x315 is the Open Graph minimum for a large preview, renders in ~4.6ms
// instead of ~12ms, and previews display at 350-500px wide anyway.
export const CARD_W = 1200;
export const CARD_H = 630;
export const OUT_W = 600;
export const OUT_H = 315;
export const SITE = 'carl-spells.com';

const C = {
  page: '#120C18',
  ink: '#F2E3C4',
  inkSoft: '#C9B48C',
  line: '#E6D3AC',
  rule: '#5A4A3A',
  accent: '#B795DB',
  tint: '#2A1E33',
};

interface Glyph { w: number; d: string }
interface Font { upm: number; ascender: number; descender: number; glyphs: Record<string, Glyph>; kern: Record<string, number> }
const fonts = glyphData as unknown as Record<'display700' | 'display500' | 'body400', Font>;
type FontKey = 'display700' | 'display500' | 'body400';

interface Run {
  text: string;
  font: FontKey;
  size: number;
  /** em, added after every character, as CSS letter-spacing */
  tracking?: number;
  /** Fake small caps: lowercase drawn as capitals at this fraction of the size. */
  smallCaps?: boolean;
  fill: string;
  /** Per-character fill overrides (UTF-16 index -> colour). */
  fills?: (string | undefined)[];
}

const SMALL_CAP = 0.74;

function glyphsOf(run: Run) {
  const font = fonts[run.font];
  const out: { g: Glyph; size: number; x: number; fill: string }[] = [];
  let x = 0;
  const track = (run.tracking ?? 0) * run.size;
  for (let i = 0; i < run.text.length; i++) {
    let ch = run.text[i];
    let size = run.size;
    if (run.smallCaps && ch !== ch.toUpperCase()) {
      ch = ch.toUpperCase();
      size *= SMALL_CAP;
    }
    const g = font.glyphs[ch] ?? font.glyphs['?'];
    const prev = run.text[i - 1];
    if (prev && !run.smallCaps) x += ((font.kern[prev + ch] ?? 0) * size) / font.upm;
    out.push({ g, size, x, fill: run.fills?.[i] ?? run.fill });
    x += (g.w * size) / font.upm + track;
  }
  // CSS letter-spacing also trails the last glyph; centring ignores it like browsers do visually.
  return { glyphs: out, width: x - (run.text.length ? track : 0) };
}

export function measure(run: Run): number {
  return glyphsOf(run).width;
}

function draw(run: Run, x: number, baseline: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const { glyphs, width } = glyphsOf(run);
  const x0 = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  const upm = fonts[run.font].upm;
  return glyphs
    .filter(({ g }) => g.d)
    .map(({ g, size, x: gx, fill }) => {
      const s = +(size / upm).toFixed(5);
      return `<path transform="translate(${(x0 + gx).toFixed(2)} ${baseline.toFixed(2)}) scale(${s})" d="${g.d}" fill="${fill}"/>`;
    })
    .join('');
}

/** Frame corner from tokens.css (.c + ::before/::after), in 1px units with the frame's outer edge at 0,0. */
const CORNER =
  `<rect x="-6.5" y="-6.5" width="7" height="7" fill="${C.page}" stroke="${C.line}"/>` +
  `<path d="M8 -6.5H40M8.5 -7V8M-7 8.5H8M-6.5 8V40" fill="none" stroke="${C.line}"/>`;

function frame(x: number, y: number, w: number, h: number, k: number): string {
  const r = x + w;
  const b = y + h;
  const corners = [
    `translate(${x} ${y}) scale(${k})`,
    `translate(${r} ${y}) scale(${-k} ${k})`,
    `translate(${x} ${b}) scale(${k} ${-k})`,
    `translate(${r} ${b}) scale(${-k})`,
  ];
  return (
    `<rect x="${x + k / 2}" y="${y + k / 2}" width="${w - k}" height="${h - k}" fill="none" stroke="${C.line}" stroke-width="${k}"/>` +
    corners.map((t) => `<g transform="${t}">${CORNER}</g>`).join('')
  );
}

/** Hairline · octagram · hairline, centred on (cx, cy). Strokes are 2 units = 1px at output. */
function ornamentRule(cx: number, cy: number): string {
  const gap = ORNAMENT_R + 12;
  const hair = (x: number) => `<rect x="${x}" y="${(cy - 1).toFixed(2)}" width="90" height="2" fill="${C.rule}"/>`;
  return hair(cx - gap - 90) + `<g transform="translate(${cx} ${cy.toFixed(2)})">${ornamentShapes(C.line, 2)}</g>` + hair(cx + gap);
}

const NAME_MAX = 168;
const NAME_WIDTH = 1000;
const LEAD = 0.95;

/** Largest size and a balanced 1- or 2-line wrap for the big name (plan: ≤168px, 1–2 lines). */
export function fitName(name: string): { size: number; lines: string[] } {
  const at = (t: string) => measure({ text: t, font: 'display700', size: 100, tracking: -0.015, fill: '' }) / 100;
  const words = name.split(' ');
  const options = [[name]];
  for (let i = 1; i < words.length; i++) options.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  let best = { size: 0, widest: Infinity, lines: [name] };
  for (const lines of options) {
    const widest = Math.max(...lines.map(at));
    const size = Math.floor(Math.min(NAME_MAX, NAME_WIDTH / widest, heightCap(lines.length)));
    // Bigger wins; on a tie (both height-capped), the more even split reads better.
    if (size > best.size || (size === best.size && widest < best.widest)) best = { size, widest, lines };
  }
  return { size: best.size, lines: best.lines };
}

// The block (struck original + name + ornament) is BLOCK_BASE + size * blockFactor(n) tall:
// 35 struck ascent + 19 gap + 38 to the ornament's centre + 25 ornament half-height = 117.
// It must clear the header line (ends ~126) and the footer row (starts ~507) by ~40px.
const BLOCK_BASE = 117;
const BLOCK_MAX = 300;
const blockFactor = (n: number) => 1.05 + LEAD * (n - 1);
const heightCap = (n: number) => (BLOCK_MAX - BLOCK_BASE) / blockFactor(n);

export interface CardInput {
  original: string;
  name: string;
  levelLine: string;
}

export function cardSvg({ original, name, levelLine }: CardInput): string {
  const { size, lines } = fitName(name);
  const changed = diff(original, name).changed;

  // Vertical block (struck original, name lines, ornament) centred where the mockup puts it.
  const pitch = size * LEAD;
  const blockH = BLOCK_BASE + size * blockFactor(lines.length);
  const top = 316 - blockH / 2; // midway between the header line and the footer row
  const struckBaseline = top + 35;
  const firstBaseline = struckBaseline + 19 + size * 0.8;
  const lastBaseline = firstBaseline + pitch * (lines.length - 1);
  const ornamentY = lastBaseline + size * 0.25 + 38;

  const struck: Run = { text: original, font: 'display500', size: 44, fill: C.inkSoft };
  const struckW = measure(struck);

  let offset = 0;
  const nameSvg = lines
    .map((line, i) => {
      const fills = [...line].map((_, j) => (changed[offset + j] ? C.accent : undefined));
      offset += line.length + 1; // the space the wrap consumed
      return draw({ text: line, font: 'display700', size, tracking: -0.015, fill: C.ink, fills }, 600, firstBaseline + pitch * i, 'center');
    })
    .join('');

  const label = (text: string, x: number, align: 'left' | 'center' | 'right', sizePx: number, tracking: number) =>
    draw({ text, font: 'body400', size: sizePx, tracking, smallCaps: true, fill: C.inkSoft }, x, align === 'center' ? 122 : 524, align);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">`,
    `<rect width="${CARD_W}" height="${CARD_H}" fill="${C.page}"/>`,
    frame(40, 40, 1120, 550, 2),
    // Labels are a size up from the mockup so they survive the half-size output.
    label('Add, change, or remove a letter', 600, 'center', 28, 0.16),
    draw(struck, 600, struckBaseline, 'center'),
    `<rect x="${(600 - struckW / 2).toFixed(2)}" y="${(struckBaseline - 15).toFixed(2)}" width="${struckW.toFixed(2)}" height="2" fill="${C.accent}"/>`,
    nameSvg,
    ornamentRule(600, ornamentY),
    label(levelLine, 97, 'left', 26, 0.1),
    label(SITE, 1103, 'right', 26, 0.1),
    `</svg>`,
  ].join('');
}

// ---- Static images, built once by data/build-images.mjs (no runtime cost) ----

/** One C·A·R·L tile at (x, y), `w` wide, drawn like the home screen's (56:48 tall:wide). */
function tile(letter: string, x: number, y: number, w: number, added: boolean): string {
  const h = (w * 56) / 48;
  const k = w / 48; // scale from the 48px app tile
  const stroke = added ? C.accent : C.line;
  const box =
    `<rect x="${x + k / 2}" y="${y + k / 2}" width="${w - k}" height="${h - k}" rx="${2 * k}" fill="${added ? C.tint : 'none'}" stroke="${stroke}" stroke-width="${k}"/>` +
    // The thicker bottom edge, rounded at its outer corners like the tile itself.
    (added ? `<path d="M${x} ${y + h - 3 * k}H${x + w}V${y + h - 2 * k}A${2 * k} ${2 * k} 0 0 1 ${x + w - 2 * k} ${y + h}H${x + 2 * k}A${2 * k} ${2 * k} 0 0 1 ${x} ${y + h - 2 * k}Z" fill="${C.accent}"/>` : '');
  const size = 40 * k;
  const baseline = y + h / 2 + size * 0.33; // optical centre for Cormorant capitals
  return box + draw({ text: letter, font: 'display700', size, fill: added ? C.accent : C.ink }, x + w / 2, baseline, 'center');
}

/** Link preview for every page that isn't a share link: the C·A·R·L tiles in the card frame. */
export function defaultCardSvg(): string {
  const w = 120, gap = 15, y = 196;
  const letters: [string, string][] = [['C', 'change'], ['A', 'add'], ['R', 'remove'], ['L', 'letters']];
  const x0 = 600 - (4 * w + 3 * gap) / 2;
  const tiles = letters
    .map(([l, word], i) => {
      const x = x0 + i * (w + gap);
      return (
        tile(l, x, y, w, l === 'A') +
        draw({ text: word, font: 'body400', size: 26, tracking: 0.08, smallCaps: true, fill: C.inkSoft }, x + w / 2, y + 140 + 44, 'center')
      );
    })
    .join('');
  const label = (text: string, x: number, align: 'left' | 'center' | 'right', y2: number, size: number, tracking: number) =>
    draw({ text, font: 'body400', size, tracking, smallCaps: true, fill: C.inkSoft }, x, y2, align);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">`,
    `<rect width="${CARD_W}" height="${CARD_H}" fill="${C.page}"/>`,
    frame(40, 40, 1120, 550, 2),
    label('Add, change, or remove a letter', 600, 'center', 122, 28, 0.16),
    tiles,
    ornamentRule(600, 446),
    label('D&D · PF2E spells', 97, 'left', 524, 26, 0.1),
    label(SITE, 1103, 'right', 524, 26, 0.1),
    `</svg>`,
  ].join('');
}

/** App icon: the orchid A tile on the page colour. `size` px square; `pad` is the safe-area margin. */
export function iconSvg(size: number, pad = 0.18): string {
  const inner = size * (1 - 2 * pad);
  const w = (inner * 48) / 56; // keep the tile's proportions inside the square
  const x = (size - w) / 2, y = (size - inner) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" fill="${C.page}"/>` +
    tile('A', x, y, w, true) +
    `</svg>`
  );
}
