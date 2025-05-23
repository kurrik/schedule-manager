import type { Context } from 'hono';
import type { Env } from '../main';
import { KVUnitOfWork } from '../infrastructure/unit-of-work/kv-unit-of-work';
import { Schedule } from '../domain/models/schedule';
import { KVUserRepository } from '../infrastructure/repositories/kv-user-repository';

type AppContext = {
  Bindings: Env['Bindings'];
  Variables: {
    session: {
      id: string;
      signedIn: boolean;
      name: string;
      email: string;
      profileImageUrl?: string;
    };
    user?: import('../domain/models/user').User;
  };
};

/**
 * Get all schedules for the current user
 */
export async function getSchedules(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const uow = new KVUnitOfWork(c.env.KV);
  try {
    const schedules = await uow.schedules.findByUserId(user.id);
    return c.json({ schedules: schedules.map(s => s.toJSON()) });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return c.json({ error: 'Failed to fetch schedules' }, 500);
  }
}

/**
 * Create a new schedule
 */
export async function createSchedule(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ name: string; timeZone: string }>();
  const { name, timeZone } = body;

  if (!name || !timeZone) {
    return c.json({ error: 'Name and timeZone are required' }, 400);
  }

  const uow = new KVUnitOfWork(c.env.KV);
  const userRepo = new KVUserRepository(c.env.KV);
  try {
    // Generate a unique URL-friendly ID for the iCal feed
    const icalUrl = `ical-${crypto.randomUUID().replace(/-/g, '')}`;

    const schedule = new Schedule({
      id: crypto.randomUUID(),
      name,
      timeZone,
      icalUrl,
      ownerId: user.id,
      sharedUserIds: [],
      entries: []
    });

    console.log('[DEBUG] Saving schedule:', schedule.toJSON());
    await uow.schedules.save(schedule);
    await uow.commit();
    return c.json({ schedule: schedule.toJSON() }, 201);
  } catch (error) {
    console.error('Error creating schedule:', error);
    return c.json({ error: 'Failed to create schedule' }, 500);
  }
}

export const scheduleHandlers = {
  getSchedules,
  createSchedule,
};
