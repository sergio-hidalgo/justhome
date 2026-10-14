import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      HOST: 'localhost',
      PORT: '4321',
      // Synthetic values: the startup preflight (R-01.6) requires a complete env.
      PUBLIC_API_URL: 'http://localhost:3001',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
