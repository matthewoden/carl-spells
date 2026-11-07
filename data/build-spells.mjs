// Build-time SRD 5.2.1 spell pipeline. Never runs at request time.
//
//   node data/build-spells.mjs            fetch the pinned SRD markdown and rebuild
//   node data/build-spells.mjs <file.md>  use a local copy of spells.md instead
//
// Source:  downfallx/dnd-5e-srd-markdown, spells.md, pinned to SRD_COMMIT (CC-BY-4.0).
// Outputs: data/spells.json      full records, the frozen source of truth for order
//          src/data/dnd.json     compact copy imported by both the app and the Worker
//
// Order is append-only: existing spells keep their position, new ones go on the end
// (alphabetically among themselves), and a spell that disappears upstream is kept and
// reported rather than silently dropped.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRD_REPO = 'downfallx/dnd-5e-srd-markdown';
const SRD_COMMIT = '1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4';
const SRD_URL = `https://raw.githubusercontent.com/${SRD_REPO}/${SRD_COMMIT}/spells.md`;

const SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
];

// Named spells belong to product identity and are not in the SRD. If one ever shows
// up in the source, fail the build rather than ship it.
const FORBIDDEN_OWNERS = [
  'Bigby', 'Mordenkainen', 'Tasha', 'Melf', 'Otiluke', 'Leomund', 'Rary', 'Nystul',
  'Tenser', 'Drawmij', 'Evard', 'Otto', 'Abi-Dalzim', 'Snilloc', 'Maximilian', 'Aganazzar',
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fullPath = join(root, 'data/spells.json');
const compactPath = join(root, 'src/data/dnd.json');

/** URL slug: lowercase, accents and apostrophes dropped, anything else non-alphanumeric
 *  becomes one hyphen. "Déjà Vu" -> deja-vu. Keep in step with src/lib/slug.ts. */
export function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parse(md) {
  const lines = md.split(/\r?\n/);
  const spells = [];
  for (let i = 0; i < lines.length; i++) {
    const h = /^#### (.+?)\s*$/.exec(lines[i]);
    if (!h) continue;
    // The next non-blank line is the italic level/school line for a spell; stat blocks
    // (Otherworldly Steed, Giant Insect, ...) also use #### and are skipped here.
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    const meta = lines[j] ?? '';
    const leveled = /^_Level (\d) (\w+) \(/.exec(meta);
    const cantrip = /^_(\w+) Cantrip \(/.exec(meta);
    if (!leveled && !cantrip) continue;
    const name = h[1].replace(/'/g, '’'); // typographic apostrophe, as in the mockups
    const level = leveled ? Number(leveled[1]) : 0;
    const school = leveled ? leveled[2] : cantrip[1];
    if (!SCHOOLS.includes(school)) throw new Error(`Unknown school "${school}" for ${name}`);
    spells.push({ slug: slugify(name), name, level, school });
  }
  return spells;
}

async function loadSource() {
  const local = process.argv[2];
  if (local) return readFileSync(local, 'utf8');
  const res = await fetch(SRD_URL);
  if (!res.ok) throw new Error(`Fetch ${SRD_URL}: ${res.status}`);
  return res.text();
}

if (import.meta.url === `file://${process.argv[1]}`) await main();

async function main() {
const parsed = parse(await loadSource());

for (const s of parsed) {
  const owner = FORBIDDEN_OWNERS.find((o) => s.name.includes(o));
  if (owner) throw new Error(`Named spell in source: ${s.name} (${owner})`);
}
const seen = new Set();
for (const s of parsed) {
  if (seen.has(s.slug)) throw new Error(`Duplicate slug: ${s.slug}`);
  seen.add(s.slug);
}

const previous = existsSync(fullPath) ? JSON.parse(readFileSync(fullPath, 'utf8')).spells : [];
const bySlug = new Map(parsed.map((s) => [s.slug, s]));
const kept = previous.map((p) => {
  const now = bySlug.get(p.slug);
  if (!now) console.warn(`warning: ${p.name} is no longer in the source; kept in place`);
  return now ?? p;
});
const known = new Set(previous.map((p) => p.slug));
const added = parsed
  .filter((s) => !known.has(s.slug))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
const spells = [...kept, ...added];

mkdirSync(dirname(compactPath), { recursive: true });
writeFileSync(
  fullPath,
  JSON.stringify(
    {
      source: `${SRD_REPO}@${SRD_COMMIT}`,
      license: 'SRD 5.2.1, Wizards of the Coast LLC, CC-BY-4.0',
      count: spells.length,
      spells,
    },
    null,
    2,
  ) + '\n',
);

// Compact form: [slug, name, level, schoolIndex], one spell per line so diffs stay readable.
const rows = spells.map((s) => JSON.stringify([s.slug, s.name, s.level, SCHOOLS.indexOf(s.school)]));
writeFileSync(
  compactPath,
  `{"schools":${JSON.stringify(SCHOOLS)},\n"spells":[\n${rows.join(',\n')}\n]}\n`,
);

console.log(`${spells.length} spells (${added.length} new) -> data/spells.json, src/data/dnd.json`);
}
