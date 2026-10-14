import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WebConfigError, loadWebConfig } from './config.ts';

const preflight = fileURLToPath(new URL('./check-env.ts', import.meta.url));

/** Synthetic environment for tests; never real credentials. */
const testEnv: Record<string, string> = {
  PUBLIC_API_URL: 'http://localhost:3001',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'test-anon-key',
  FLAG_JOINT_MODE: 'false',
  FLAG_EXPORT: 'false',
};

function without(name: string): Record<string, string> {
  const env = { ...testEnv };
  delete env[name];
  return env;
}

describe('web environment validation', () => {
  it('R-01.6 parses a complete environment and coerces flags to booleans', () => {
    const config = loadWebConfig({ ...testEnv, FLAG_EXPORT: 'true' });
    expect(config.FLAG_EXPORT).toBe(true);
    expect(config.FLAG_JOINT_MODE).toBe(false);
  });

  it('R-01.6 loadWebConfig names the missing variable', () => {
    try {
      loadWebConfig(without('PUBLIC_API_URL'));
      expect.unreachable('loadWebConfig should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(WebConfigError);
      expect((error as WebConfigError).variables).toContain('PUBLIC_API_URL');
      expect((error as WebConfigError).message).toContain('PUBLIC_API_URL');
    }
  });

  it('R-01.6 does not accept server secrets as part of the web schema', () => {
    const config = loadWebConfig({ ...testEnv, SUPABASE_SERVICE_ROLE_KEY: 'must-not-leak' });
    expect(config).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('R-01.6 the startup preflight exits non-zero and names the missing variable', () => {
    const result = spawnSync(process.execPath, [preflight], {
      env: { ...without('SUPABASE_URL'), PATH: process.env['PATH'] ?? '' },
      encoding: 'utf8',
      timeout: 20_000,
    });

    expect(result.status).not.toBe(0);
    expect(result.status).not.toBeNull();
    expect(result.stderr).toContain('SUPABASE_URL');
  });

  it('R-01.6 the startup preflight passes with a complete environment', () => {
    const result = spawnSync(process.execPath, [preflight], {
      env: { ...testEnv, PATH: process.env['PATH'] ?? '' },
      encoding: 'utf8',
      timeout: 20_000,
    });

    expect(result.status).toBe(0);
  });
});
