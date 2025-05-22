import type { KVNamespace } from '@cloudflare/workers-types';
import type { IUnitOfWork } from '../../domain/repositories';
import { KVUserRepository } from '../repositories/kv-user-repository';
import { KVScheduleRepository } from '../repositories/kv-schedule-repository';

export class KVUnitOfWork implements IUnitOfWork {
  public readonly users: KVUserRepository;
  public readonly schedules: KVScheduleRepository;

  constructor(kv: KVNamespace) {
    this.users = new KVUserRepository(kv);
    this.schedules = new KVScheduleRepository(kv);
  }

  /**
   * Commits all changes in the current unit of work.
   * Note: KV doesn't support transactions, so this is a no-op.
   */
  async commit(): Promise<void> {
    // No-op for KV as it doesn't support transactions
    return Promise.resolve();
  }

  /**
   * Rolls back all changes in the current unit of work.
   * @throws {Error} Always throws as KV doesn't support transactions
   */
  async rollback(): Promise<void> {
    throw new Error('Rollback not supported in Cloudflare KV storage');
  }
}
