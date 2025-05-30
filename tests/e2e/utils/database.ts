import { execSync } from 'child_process';

/**
 * Clear all test data from database tables
 */
export async function clearTestDatabase() {
  try {
    execSync('./scripts/clear-test-database.sh', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Failed to clear test database:', error);
    throw error;
  }
}

/**
 * Initialize test database with migrations (run once)
 */
export async function initializeTestDatabase() {
  try {
    execSync('npm run migrate:test:local', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Setup fresh test database for each test suite
 */
export async function setupTestDatabase() {
  await clearTestDatabase();
}