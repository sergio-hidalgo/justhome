import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from './index.js';

describe('engine scaffold', () => {
  it('R-01.1 exports ENGINE_VERSION = "0.1.0"', () => {
    expect(ENGINE_VERSION).toBe('0.1.0');
  });
});
