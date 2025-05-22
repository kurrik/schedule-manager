import { User } from '../models/user';
import { Schedule } from '../models/schedule';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
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
