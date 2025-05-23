import type { KVNamespace } from '@cloudflare/workers-types';
import { Schedule } from '../../domain/models/schedule';
import type { ScheduleProps } from '../../domain/models/schedule';
import type { IScheduleRepository } from '../../domain/repositories';

export class KVScheduleRepository implements IScheduleRepository {
  private readonly kv: KVNamespace;
  private readonly namespace: string;

  constructor(kv: KVNamespace, namespace = 'schedules') {
    this.kv = kv;
    this.namespace = namespace;
  }

  async findById(id: string): Promise<Schedule | null> {
    const data = await this.kv.get<ScheduleProps>(this.getKey(id), 'json');
    return data ? new Schedule(data) : null;
  }

  async findByUserId(userId: string): Promise<Schedule[]> {
    // Note: This is a simplified implementation. In a real app, you'd want to maintain
    // an index of schedules by user ID.
    const allSchedules = await this.kv.list({ prefix: `${this.namespace}:` });
    console.log('[DEBUG] Schedule keys found:', allSchedules.keys.map(k => k.name));
    const schedules: Schedule[] = [];

    for (const key of allSchedules.keys) {
      if (key.name) {
        const data = await this.kv.get<ScheduleProps>(key.name, 'json');
        if (data) {
          console.log(`[DEBUG] Loaded schedule id=${data.id} ownerId=${data.ownerId}`);
          if (data.ownerId === userId || data.sharedUserIds?.includes(userId)) {
            schedules.push(new Schedule(data));
          }
        }
      }
    }

    return schedules;
  }

  async save(schedule: Schedule): Promise<void> {
    await this.kv.put(
      this.getKey(schedule.id),
      JSON.stringify(schedule.toJSON())
    );
  }

  async delete(id: string): Promise<void> {
    await this.kv.delete(this.getKey(id));
  }

  private getKey(id: string): string {
    return `${this.namespace}:${id}`;
  }
}
