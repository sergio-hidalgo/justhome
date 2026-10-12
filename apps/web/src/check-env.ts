// Startup preflight (R-01.6): run by the `dev` and `start` scripts before Astro boots.
// Not part of the build, so `astro build` works on a clean clone without any env.
import { WebConfigError, loadWebConfig } from './config.ts';

try {
  loadWebConfig(process.env);
} catch (error) {
  console.error(error instanceof WebConfigError ? error.message : error);
  process.exit(1);
}
