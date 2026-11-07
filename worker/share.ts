// GET /s/:spell/:name — the app's own index.html with the <head> rewritten for crawlers
// (Open Graph + Twitter card, absolute URLs) and a static copy of the card in #root, so
// link previews and no-JS readers see the joke. The app then renders over it.
import { OUT_H, OUT_W } from '../src/lib/card';
import { editorPath, ogPath, parseJoke, type Joke } from '../src/lib/share';
import { GAME_INFO, gameQuery } from '../src/lib/spells';
import { diff } from '../src/lib/diff';
import { ORNAMENT_SVG } from '../src/lib/ornament';



const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function highlighted(original: string, name: string): string {
  const changed = diff(original, name).changed;
  return [...name].map((ch, i) => (changed[i] ? `<span class="edit">${esc(ch)}</span>` : esc(ch))).join('');
}

// docs/design/button-tip.svg, as src/components/HexButton.tsx draws it.
const TIP =
  '<svg viewBox="0 0 28 32" aria-hidden="true"><path class="bg" d="M28 0.5L12 16L28 31.5Z"/><path d="M28 0.5L12 16L28 31.5" fill="none" stroke="currentColor" stroke-width="1"/><rect x="6.34" y="10.34" width="11.31" height="11.31" fill="none" stroke="currentColor" stroke-width="1" transform="rotate(45 12 16)"/><rect x="13.17" y="13.17" width="5.66" height="5.66" fill="currentColor" transform="rotate(45 16 16)"/></svg>';
const hex = (href: string, label: string) =>
  `<a class="hex" href="${href}"><span class="l" aria-hidden="true">${TIP}</span><span class="r" aria-hidden="true">${TIP}</span>${label}</a>`;

// src/components/CarlMark.tsx, full size.
const MARK = [['C', 'change'], ['A', 'add'], ['R', 'remove'], ['L', 'letters']]
  .map(([l, w]) => `<span class="cm-col" aria-hidden="true"><span class="cm-tile"${l === 'A' ? ' data-hl="true"' : ''}>${l}</span><span class="cm-word">${w}</span></span>`)
  .join('');

/** Same markup and classes as src/routes/Share.tsx, minus interactivity. */
function cardHtml(j: Joke): string {
  const line = [j.spell.line, j.status].filter(Boolean).join(' · ');
  return `<main class="page share">
<a href="/" class="carl-mark carl-mark-full share-mark"><span class="sr-only">CARL, home</span>${MARK}</a>
<div class="frame share-card"><span class="c c-tl"></span><span class="c c-tr"></span><span class="c c-bl"></span><span class="c c-br"></span>
<div class="share-in">
<span class="smallcaps cast">Someone cast</span>
<p class="original"><s>${esc(j.spell.name)}</s></p>
<h1 class="share-name">${highlighted(j.spell.name, j.name)}</h1>
<div class="ornament-rule" aria-hidden="true"><span class="hair"></span>${ORNAMENT_SVG}<span class="hair"></span></div>
<p class="smallcaps share-line">${esc(line)}</p>
</div></div>
<div class="spacer"></div>
<p class="pitch">Pick any spell. Add, change, or remove one letter. Pass it around the table.</p>
<div class="actions">${hex('/', 'Cast your own')}${hex(esc(editorPath(j.spell, j.nameSlug)), 'Remix this one')}</div>
<p class="attribution"><a href="/about">${esc(GAME_INFO[j.spell.game].attribution)}</a></p>
</main>`;
}

export async function handleShare(request: Request, env: { ASSETS: Fetcher }): Promise<Response> {
  const url = new URL(request.url);
  const [, , spellSlug = '', nameSlug = ''] = url.pathname.split('/');
  const joke = parseJoke(spellSlug, decodeURIComponent(nameSlug), url.searchParams.get('g'));

  // The SPA shell for "/" is index.html; asking for it by path avoids a redirect.
  const shell = await env.ASSETS.fetch(new Request(new URL('/', url)));
  if (!joke) {
    return new Response(shell.body, { status: 404, headers: shell.headers });
  }

  const canonical = `${url.origin}/s/${joke.spell.slug}/${joke.nameSlug}${gameQuery(joke.spell)}`;
  const title = `${joke.name} · CARL`;
  const description = `${joke.spell.name} → ${joke.name}. ${joke.spell.line}${joke.status ? `, ${joke.status}` : ''}. Add, change, or remove a letter.`;
  const image = `${url.origin}${ogPath(joke)}`;
  const meta = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'CARL'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', canonical],
    ['property', 'og:image', image],
    ['property', 'og:image:width', String(OUT_W)],
    ['property', 'og:image:height', String(OUT_H)],
    ['property', 'og:image:alt', `${joke.spell.name} struck out, ${joke.name} written below`],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', image],
  ]
    .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${esc(value)}" />`)
    .join('\n    ');

  const rewritten = new HTMLRewriter()
    // Drop the app's default preview tags; this joke's own go into <head> below.
    .on('meta[property^="og:"], meta[name^="twitter:"]', { element: (el) => void el.remove() })
    .on('title', { element: (el) => void el.setInnerContent(title) })
    .on('meta[name="description"]', { element: (el) => void el.setAttribute('content', description) })
    .on('head', {
      element: (el) => void el.append(`<link rel="canonical" href="${esc(canonical)}" />\n    ${meta}\n`, { html: true }),
    })
    .on('div#root', { element: (el) => void el.setInnerContent(cardHtml(joke), { html: true }) })
    .transform(shell);

  const headers = new Headers(rewritten.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  // Browsers and crawlers may reuse it for a day; the content never changes per URL.
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  headers.delete('ETag');
  return new Response(rewritten.body, { status: 200, headers });
}
