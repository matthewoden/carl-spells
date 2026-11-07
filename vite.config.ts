import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Build-time page settings, from the environment or .env.production:
 *   SITE_URL         absolute origin for link previews, e.g. https://carl.example.workers.dev
 *                    (crawlers want absolute og:image URLs; without it they stay relative)
 *   CF_BEACON_TOKEN  Cloudflare Web Analytics site token; no token, no analytics script
 */
function pageSettings(env: Record<string, string>): Plugin {
  const site = (env.SITE_URL ?? '').replace(/\/$/, '');
  const token = env.CF_BEACON_TOKEN ?? '';
  return {
    name: 'carl-page-settings',
    transformIndexHtml(html) {
      let out = html;
      if (site) out = out.replace('content="/og-default.png"', `content="${site}/og-default.png"`);
      if (token) {
        const beacon = `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token })}'></script>`;
        out = out.replace('</body>', `  ${beacon}\n  </body>`);
      }
      return out;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), pageSettings(env)],
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
