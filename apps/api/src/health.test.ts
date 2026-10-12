import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

describe('GET /health', () => {
  it('AC-01.2 returns 200 {"status":"ok","engineVersion":"0.1.0"}', async () => {
    const app = buildApp({ config: testConfig });
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', engineVersion: '0.1.0' });
    await app.close();
  });
});
