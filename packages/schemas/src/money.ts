import { z } from 'zod';

/** Integer euro cents, as used by the DB and the API (R-02.7). */
export const cents = z
  .number()
  .int()
  .refine(Number.isSafeInteger, 'must be a safe integer')
  .describe('Amount of money in integer euro cents (EUR × 100).');
export type Cents = z.infer<typeof cents>;

/** Cents (API/DB) → euros (engine). */
export function toEngine(amountCents: number): number {
  return amountCents / 100;
}

/** Euros (engine) → integer cents (API/DB), rounded to the nearest cent. */
export function fromEngine(amountEur: number): number {
  return Math.round(amountEur * 100);
}
