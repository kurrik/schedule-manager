import { User } from '../models/user';
import { Schedule } from '../models/schedule';

/**
 * Interface for user repository operations.
 */
export interface IUserRepository {
  /**
   * Finds a user by their unique ID.
   */
  findById(id: string): Promise<User | null>;
  /**
   * Finds a user by their email address.
   */
  findByEmail(email: string): Promise<User | null>;
  /**
   * Upserts a user by email.
   */
  upsertByEmail(props: { email: string; displayName: string; profileImageUrl: string }): Promise<User>;
  /**
   * Saves a user.
   */
  save(user: User): Promise<void>;
}


export interface IScheduleRepository {
  findById(id: string): Promise<Schedule | null>;
  findByUserId(userId: string): Promise<Schedule[]>;
  save(schedule: Schedule): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IUnitOfWork {
  users: IUserRepository;
  schedules: IScheduleRepository;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
