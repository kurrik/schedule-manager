import { FullConfig } from '@playwright/test';
import { initializeTestDatabase } from '../utils';

async function globalSetup(config: FullConfig) {
  // Initialize test database with migrations (run once)
  await initializeTestDatabase();
}

export default globalSetup;