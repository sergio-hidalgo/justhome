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
    env: { HOST: 'localhost', PORT: '4321' },
  },
});
