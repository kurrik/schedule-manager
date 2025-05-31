export * from './auth';
export { clearTestDatabase, initializeTestDatabase, setupTestDatabase } from './database';
export * from './schedule-helpers';

/**
 * Generates a unique name with a random identifier suffix
 * @param baseName - Base name to use (e.g., "Test Schedule")
 * @returns Name with random suffix (e.g., "Test Schedule abc123")
 */
export function getUniqueName(baseName: string): string {
  return `${baseName} ${Math.random().toString(36).substring(7)}`;
}