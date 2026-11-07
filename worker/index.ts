// The only code that runs at request time. Assets (the app, fonts, data) are served
// straight from the [assets] binding; wrangler.toml routes just /s/* and /og/* here.
import { handleOg } from './og';
import { handleShare } from './share';

export interface Env {
  ASSETS: Fetcher;
  OG: KVNamespace;
  OG_RENDERS: RateLimit;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/og/')) return handleOg(request, env, ctx);
    if (pathname.startsWith('/s/')) return handleShare(request, env);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
