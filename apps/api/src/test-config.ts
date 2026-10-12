import { loadConfig } from './config.js';

/** Synthetic environment for tests; never real credentials. */
export const testEnv: Record<string, string> = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  STRIPE_PRICE_PACK5: 'price_pack5',
  STRIPE_PRICE_SELLER5: 'price_seller5',
  STRIPE_PRICE_SELLER_PLUS: 'price_seller_plus',
  FLAG_JOINT_MODE: 'false',
  FLAG_EXPORT: 'false',
};

export const testConfig = loadConfig(testEnv);
