import type { D1Database } from '@cloudflare/workers-types';
import type { IUnitOfWork, IUserRepository, IScheduleRepository, IScheduleOverrideRepository } from '../../domain/repositories';
import { D1UserRepository } from '../repositories/d1-user-repository';
import { D1ScheduleRepository } from '../repositories/d1-schedule-repository';
import { D1ScheduleOverrideRepository } from '../repositories/d1-schedule-override-repository';

export class D1UnitOfWork implements IUnitOfWork {
  public readonly users: IUserRepository;
  public readonly schedules: IScheduleRepository;
  public readonly overrides: IScheduleOverrideRepository;

  constructor(db: D1Database) {
    this.users = new D1UserRepository(db);
    this.schedules = new D1ScheduleRepository(db);
    this.overrides = new D1ScheduleOverrideRepository(db);
  }

  async commit(): Promise<void> {
    // D1 operations are automatically committed
    // In the future, if we need transactions, we could implement them here
  }

  async rollback(): Promise<void> {
    // D1 operations are automatically committed
    // In the future, if we need transactions, we could implement them here
    throw new Error('Rollback not implemented for D1UnitOfWork');
  }
}