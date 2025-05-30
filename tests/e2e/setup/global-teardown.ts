import { FullConfig } from '@playwright/test';
import { clearTestDatabase } from '../utils';

async function globalTeardown(config: FullConfig) {
  // Clean up test database after all tests
  await clearTestDatabase();
}

export default globalTeardown;