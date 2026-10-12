import type { FastifyInstance } from 'fastify';
import { ENGINE_VERSION } from '@vivienda/engine';

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async () => ({ status: 'ok', engineVersion: ENGINE_VERSION }));
}
