import { z } from 'zod';

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_PACK5: z.string().min(1),
  STRIPE_PRICE_SELLER5: z.string().min(1),
  STRIPE_PRICE_SELLER_PLUS: z.string().min(1),
  FLAG_JOINT_MODE: flag,
  FLAG_EXPORT: flag,
});

export type Config = z.infer<typeof envSchema>;

/** Thrown when the environment is invalid; the message names every offending variable. */
export class ConfigError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[], details: readonly string[]) {
    super(`Invalid environment configuration:\n${details.map((line) => `  - ${line}`).join('\n')}`);
    this.name = 'ConfigError';
    this.variables = variables;
  }
}

/** The only place the process environment is read (R-01.6). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (parsed.success) return parsed.data;

  const variables = parsed.error.issues.map((issue) => String(issue.path[0] ?? '(root)'));
  const details = parsed.error.issues.map(
    (issue) => `${String(issue.path[0] ?? '(root)')}: ${issue.message}`,
  );
  throw new ConfigError(variables, details);
}
