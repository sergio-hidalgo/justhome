import { z } from 'zod';

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

/** Server-side web env. Secrets (service role, Stripe) belong to apps/api only. */
export const envSchema = z.object({
  PUBLIC_API_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  FLAG_JOINT_MODE: flag,
  FLAG_EXPORT: flag,
});

export type WebConfig = z.infer<typeof envSchema>;

/** Thrown when the environment is invalid; the message names every offending variable. */
export class WebConfigError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[], details: readonly string[]) {
    super(`Invalid environment configuration:\n${details.map((line) => `  - ${line}`).join('\n')}`);
    this.name = 'WebConfigError';
    this.variables = variables;
  }
}

/** The only place the web app's environment is parsed (R-01.6). */
export function loadWebConfig(env: Record<string, string | undefined>): WebConfig {
  const parsed = envSchema.safeParse(env);
  if (parsed.success) return parsed.data;

  const variables = parsed.error.issues.map((issue) => String(issue.path[0] ?? '(root)'));
  const details = parsed.error.issues.map(
    (issue) => `${String(issue.path[0] ?? '(root)')}: ${issue.message}`,
  );
  throw new WebConfigError(variables, details);
}
