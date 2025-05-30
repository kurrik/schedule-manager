import { User } from '../models/user';
import { Schedule } from '../models/schedule';
import { SchedulePhase } from '../models/schedule-phase';
import { ScheduleOverride } from '../models/schedule-override';

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
  findByICalUrl(icalUrl: string): Promise<Schedule | null>;
  create(schedule: Schedule): Promise<void>;
  update(schedule: Schedule): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ISchedulePhaseRepository {
  findById(id: string): Promise<SchedulePhase | null>;
  findByScheduleId(scheduleId: string): Promise<SchedulePhase[]>;
  create(phase: SchedulePhase): Promise<void>;
  update(phase: SchedulePhase): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IScheduleOverrideRepository {
  findById(id: string): Promise<ScheduleOverride | null>;
  findByScheduleId(scheduleId: string): Promise<ScheduleOverride[]>;
  findByScheduleIdAndDateRange(scheduleId: string, startDate: string, endDate: string): Promise<ScheduleOverride[]>;
  save(override: ScheduleOverride): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IUnitOfWork {
  users: IUserRepository;
  schedules: IScheduleRepository;
  phases: ISchedulePhaseRepository;
  overrides: IScheduleOverrideRepository;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
