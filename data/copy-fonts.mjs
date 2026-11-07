// Copies the self-hosted, Latin-subset woff2 files from @fontsource into public/fonts.
// The files are committed, so this only needs re-running when the font packages change.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/fonts');
mkdirSync(out, { recursive: true });

const fonts = [
  ['cormorant-garamond', ['500-normal', '600-normal', '700-normal']],
  ['alegreya', ['400-normal', '500-normal', '400-italic']],
];

for (const [family, styles] of fonts) {
  for (const style of styles) {
    const file = `${family}-latin-${style}.woff2`;
    copyFileSync(join(root, 'node_modules/@fontsource', family, 'files', file), join(out, file));
    console.log(`public/fonts/${file}`);
  }
}
