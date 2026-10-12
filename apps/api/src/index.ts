import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';

const PORT = 3001;
const HOST = '0.0.0.0';

try {
  const config = loadConfig();
  const app = buildApp({ config, logger: true });
  await app.listen({ port: PORT, host: HOST });
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
}
