import { Schedule } from '../models/schedule';
import { ScheduleEntry } from '../models/schedule-entry';
import type { IUnitOfWork } from '../repositories';

export class ScheduleService {
  private readonly uow: IUnitOfWork;

  constructor(uow: IUnitOfWork) {
    this.uow = uow;
  }

  async createSchedule(
    userId: string,
    name: string,
    timeZone: string,
    icalUrl: string
  ): Promise<Schedule> {
    const schedule = new Schedule({
      id: crypto.randomUUID(),
      ownerId: userId,
      sharedUserIds: [],
      name,
      timeZone,
      icalUrl,
      entries: [],
    });

    await this.uow.schedules.save(schedule);
    await this.uow.commit();
    return schedule;
  }

  async addScheduleEntry(
    scheduleId: string,
    userId: string,
    entry: ScheduleEntry
  ): Promise<void> {
    const schedule = await this.uow.schedules.findById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (!schedule.isAccessibleBy(userId)) {
      throw new Error('Not authorized to modify this schedule');
    }

    schedule.addEntry(entry);
    await this.uow.schedules.save(schedule);
    await this.uow.commit();
  }

  async shareSchedule(
    scheduleId: string,
    ownerId: string,
    targetUserId: string
  ): Promise<void> {
    const schedule = await this.uow.schedules.findById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (schedule.ownerId !== ownerId) {
      throw new Error('Only the owner can share this schedule');
    }

    const user = await this.uow.users.findById(targetUserId);
    if (!user) {
      throw new Error('Target user not found');
    }

    schedule.shareWithUser(targetUserId);
    await this.uow.schedules.save(schedule);
    await this.uow.commit();
  }
}
