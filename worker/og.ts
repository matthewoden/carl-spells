// GET /og/:spell/:name.png — the 600x315 preview image.
//
// Order of lookups, cheapest first: edge Cache API (no CPU), KV (one read), then a
// resvg render of the SVG card: ~4.6ms CPU on an M-series Mac at 600x315 (vs ~12ms at
// 1200x630), inside the free plan's 10ms. Each joke renders once, then lives in KV and
// the edge cache. If the dashboard ever shows "Exceeded CPU", fall back to per-spell
// static images built at deploy time.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { cardSvg } from '../src/lib/card';
import { OG_VERSION, ogPath, parseJoke } from '../src/lib/share';

export interface OgEnv {
  OG: KVNamespace;
  OG_RENDERS: RateLimit;
}

const TTL = 60 * 60 * 24 * 30; // 30 days in KV; the Cache API copy is immutable
const HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

let wasmReady: Promise<void> | undefined;

export async function handleOg(request: Request, env: OgEnv, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const url = new URL(request.url);
  const m = /^\/og\/([a-z0-9-]+)\/([A-Za-z0-9'-]+)\.png$/.exec(url.pathname);
  const joke = m && parseJoke(m[1], m[2], url.searchParams.get('g'));
  if (!joke) return new Response('Not found', { status: 404 });

  // One cache entry per joke, game (only for shared names) and card version, whatever
  // else is in the query string.
  const cacheKey = new Request(`${url.origin}${ogPath(joke)}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const kvKey = `v${OG_VERSION}/${joke.spell.game}/${joke.spell.slug}/${joke.nameSlug}`;
  let png: ArrayBuffer | Uint8Array | null = await env.OG.get(kvKey, 'arrayBuffer');
  if (!png) {
    // Only a fresh render costs real CPU, so only renders are rate limited.
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const { success } = await env.OG_RENDERS.limit({ key: ip });
    if (!success) {
      return new Response('Too many new previews; try again in a minute.', { status: 429, headers: { 'Retry-After': '60' } });
    }
    wasmReady ??= initWasm(resvgWasm);
    await wasmReady;
    png = new Resvg(cardSvg({ original: joke.spell.name, name: joke.name, levelLine: joke.spell.line })).render().asPng();
    ctx.waitUntil(env.OG.put(kvKey, png, { expirationTtl: TTL }));
  }

  const response = new Response(png, { headers: HEADERS });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
