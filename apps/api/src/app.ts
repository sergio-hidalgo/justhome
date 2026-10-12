import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config.js';
import { registerHealthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  config: Config;
  logger?: boolean;
}

export function buildApp({ logger = false }: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger });
  registerHealthRoutes(app);
  return app;
}
