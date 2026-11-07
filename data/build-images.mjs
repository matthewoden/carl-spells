// Builds the static images: the default link preview and the app icons.
//
//   npm run images
//
// They're drawn by src/lib/card.ts (the same code as the share card), bundled to
// data/.cache/card.mjs first because it's TypeScript that imports JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { defaultCardSvg, iconSvg } = await import(join(root, 'data/.cache/card.mjs'));
await initWasm(readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')));

const png = (svg) => new Resvg(svg).render().asPng();
const out = (name, data) => {
  writeFileSync(join(root, 'public', name), data);
  console.log(`public/${name} ${(data.length / 1024).toFixed(1)} KB`);
};

out('og-default.png', png(defaultCardSvg()));
out('apple-touch-icon.png', png(iconSvg(180, 0.16))); // iOS adds its own rounded mask
out('icon-192.png', png(iconSvg(192)));
out('icon-512.png', png(iconSvg(512)));
out('favicon.svg', Buffer.from(iconSvg(32, 0.06)));
