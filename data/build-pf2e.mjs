// Build-time Pathfinder 2E spell pipeline. Never runs at request time.
//
//   node data/build-pf2e.mjs              fetch the pinned Foundry commit (sparse) and rebuild
//   node data/build-pf2e.mjs <repo-dir>   use an existing checkout of foundryvtt/pf2e
//
// Source:  foundryvtt/pf2e, packs/pf2e/spells/spells/**, pinned to PF2E_COMMIT.
//          Each spell records its own license and book in system.publication.
// Scope:   ORC-licensed Remaster spells from Player Core and Player Core 2 only (no focus
//          spells, rituals, legacy OGL content, or Lost Omens books, whose Golarion names
//          are Paizo Reserved Material).
// Outputs: data/pf2e-spells.json  full records, the frozen source of truth for order
//          src/data/pf2e.json     compact copy imported by both the app and the Worker
//
// Order is append-only, as for the D&D list. The build fails on any slug collision within
// PF2E, or with a D&D spell whose name differs (same slug must mean the same name).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './build-spells.mjs';

const REPO = 'https://github.com/foundryvtt/pf2e.git';
const PF2E_COMMIT = '2528e47d7f042c19d4c2caffcdb76820d3a44424';
const BOOKS = ['Pathfinder Player Core', 'Pathfinder Player Core 2'];
const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fullPath = join(root, 'data/pf2e-spells.json');
const compactPath = join(root, 'src/data/pf2e.json');
const dndPath = join(root, 'data/spells.json');

function checkout() {
  if (process.argv[2]) return process.argv[2];
  const dir = join(root, 'data/.cache/pf2e');
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' }).toString().trim();
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(dir, { recursive: true });
    git('init', '-q');
    git('remote', 'add', 'origin', REPO);
    git('sparse-checkout', 'set', 'packs/pf2e/spells/spells', 'static/licenses');
  }
  let head = '';
  try {
    head = git('rev-parse', 'HEAD');
  } catch {
    /* fresh repo, nothing checked out yet */
  }
  if (head !== PF2E_COMMIT) {
    git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', PF2E_COMMIT);
    git('checkout', '-q', PF2E_COMMIT);
  }
  return dir;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.json') && !name.startsWith('_')) out.push(p);
  }
  return out;
}

/** Same name for collision purposes: case, apostrophe style and accents don't count. */
const fold = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/’/g, "'");

const repo = checkout();

const spells = [];
for (const file of walk(join(repo, 'packs/pf2e/spells/spells'))) {
  const d = JSON.parse(readFileSync(file, 'utf8'));
  const s = d.system;
  const pub = s.publication ?? {};
  if (d.type !== 'spell' || pub.license !== 'ORC' || !BOOKS.includes(pub.title)) continue;
  const traits = s.traits ?? {};
  const traditions = (traits.traditions ?? []).filter((t) => TRADITIONS.includes(t)).sort();
  if (!traditions.length) throw new Error(`${d.name}: no tradition`);
  const name = d.name.replace(/'/g, '’'); // typographic apostrophe, as for D&D
  spells.push({
    slug: slugify(name),
    name,
    rank: (traits.value ?? []).includes('cantrip') ? 0 : s.level.value,
    traditions,
    rarity: traits.rarity,
    book: pub.title,
  });
}
if (spells.length < 400) throw new Error(`Only ${spells.length} spells found; check the source layout`);

// Collisions: within PF2E, and against D&D names that share a slug.
const seen = new Map();
for (const s of spells) {
  if (seen.has(s.slug)) throw new Error(`PF2E slug collision: "${seen.get(s.slug)}" and "${s.name}" -> ${s.slug}`);
  seen.set(s.slug, s.name);
}
const dnd = new Map(JSON.parse(readFileSync(dndPath, 'utf8')).spells.map((s) => [s.slug, s.name]));
let shared = 0;
for (const s of spells) {
  const other = dnd.get(s.slug);
  if (!other) continue;
  if (fold(other) !== fold(s.name)) throw new Error(`Cross-game slug collision: D&D "${other}" vs PF2E "${s.name}" -> ${s.slug}`);
  shared++;
}

// Attribution lines for exactly these books, verbatim from Foundry's copy of Paizo's notice.
const notice = readFileSync(join(repo, 'static/licenses/ORCLicense.md'), 'utf8');
const attribution = BOOKS.map((book) => {
  const line = notice.split('\n').find((l) => l.replace(/^[\s*]+/, '').startsWith(`${book} ©`));
  if (!line) throw new Error(`No attribution line for ${book}`);
  return line.replace(/^[\s*]+/, '').trim();
});

const previous = existsSync(fullPath) ? JSON.parse(readFileSync(fullPath, 'utf8')).spells : [];
const bySlug = new Map(spells.map((s) => [s.slug, s]));
const kept = previous.map((p) => {
  const now = bySlug.get(p.slug);
  if (!now) console.warn(`warning: ${p.name} is no longer in the source; kept in place`);
  return now ?? p;
});
const known = new Set(previous.map((p) => p.slug));
const added = spells.filter((s) => !known.has(s.slug)).sort((a, b) => a.name.localeCompare(b.name, 'en'));
const all = [...kept, ...added];

mkdirSync(dirname(compactPath), { recursive: true });
writeFileSync(
  fullPath,
  JSON.stringify(
    { source: `foundryvtt/pf2e@${PF2E_COMMIT}`, license: 'ORC License (Paizo Inc.)', books: BOOKS, attribution, count: all.length, spells: all },
    null,
    2,
  ) + '\n',
);

// Compact: [slug, name, rank (0 = cantrip), traditions bitmask over TRADITIONS].
const mask = (ts) => ts.reduce((m, t) => m | (1 << TRADITIONS.indexOf(t)), 0);
const rows = all.map((s) => JSON.stringify([s.slug, s.name, s.rank, mask(s.traditions)]));
writeFileSync(
  compactPath,
  `{"traditions":${JSON.stringify(TRADITIONS)},\n"attribution":${JSON.stringify(attribution)},\n"spells":[\n${rows.join(',\n')}\n]}\n`,
);

console.log(`${all.length} spells (${added.length} new, ${shared} names shared with D&D, no collisions) -> data/pf2e-spells.json, src/data/pf2e.json`);
