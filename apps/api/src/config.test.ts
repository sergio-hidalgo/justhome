import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.js';
import { testEnv } from './test-config.js';

const entry = fileURLToPath(new URL('./index.ts', import.meta.url));

function withoutSupabaseUrl(): Record<string, string> {
  const env = { ...testEnv };
  delete env['SUPABASE_URL'];
  return env;
}

describe('environment validation', () => {
  it('R-01.6 parses a complete environment and coerces flags to booleans', () => {
    const config = loadConfig({ ...testEnv, FLAG_EXPORT: 'true' });
    expect(config.FLAG_EXPORT).toBe(true);
    expect(config.FLAG_JOINT_MODE).toBe(false);
  });

  it('AC-01.4 loadConfig names the missing variable', () => {
    const env = withoutSupabaseUrl();
    try {
      loadConfig(env);
      expect.unreachable('loadConfig should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).variables).toContain('SUPABASE_URL');
      expect((error as ConfigError).message).toContain('SUPABASE_URL');
    }
  });

  it('AC-01.4 starting the API without SUPABASE_URL exits non-zero and names the variable', () => {
    const env = withoutSupabaseUrl();
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      env: { ...env, PATH: process.env['PATH'] ?? '' },
      encoding: 'utf8',
      timeout: 20_000,
    });

    expect(result.status).not.toBe(0);
    expect(result.status).not.toBeNull();
    expect(result.stderr).toContain('SUPABASE_URL');
  });
});
