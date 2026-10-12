import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';
import { t } from './index';

describe('i18n scaffold', () => {
  it('R-01.1 es.json and en.json define the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('R-01.1 t() resolves a key in the requested locale', () => {
    expect(t('es', 'placeholder.heading')).toBe(es['placeholder.heading']);
    expect(t('en', 'placeholder.heading')).toBe(en['placeholder.heading']);
  });
});
