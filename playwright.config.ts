import { defineConfig, devices } from '@playwright/test';

// End-to-end checks against the real Worker + assets (wrangler dev), on a phone-sized
// Chromium. Its own port and storage, so it never touches a dev server you're running.
//   npm run e2e
const PORT = 8798;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
  },
  projects: [
    { name: 'phone', use: { ...devices['iPhone 14'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: `npm run build && npx wrangler dev --port ${PORT} --persist-to .wrangler/e2e-state`,
    url: `http://localhost:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
