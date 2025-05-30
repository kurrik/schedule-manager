import type { Context } from 'hono';
import type { Env } from '../main';
import { D1UnitOfWork } from '../infrastructure/unit-of-work/d1-unit-of-work';
import { Schedule } from '../domain/models/schedule';
import { SchedulePhase } from '../domain/models/schedule-phase';
import { ScheduleEntry } from '../domain/models/schedule-entry';

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

  const uow = new D1UnitOfWork(c.env.DB);
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

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    // Generate a unique URL-friendly ID for the iCal feed
    const icalUrl = `ical-${crypto.randomUUID().replace(/-/g, '')}`;

    // Create a default phase for the new schedule
    const defaultPhase = new SchedulePhase({
      id: `default-${crypto.randomUUID()}`,
      scheduleId: crypto.randomUUID(),
      name: 'Default Phase',
      entries: []
    });

    const schedule = new Schedule({
      id: defaultPhase.scheduleId,
      name,
      timeZone,
      icalUrl,
      ownerId: user.id,
      sharedUserIds: [],
      phases: [defaultPhase]
    });

    console.log('[DEBUG] Creating schedule:', schedule.toJSON());
    await uow.schedules.create(schedule);
    await uow.commit();
    return c.json({ schedule: schedule.toJSON() }, 201);
  } catch (error) {
    console.error('Error creating schedule:', error);
    return c.json({ error: 'Failed to create schedule' }, 500);
  }
}

/**
 * Get a specific schedule by ID
 */
export async function getSchedule(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to view this schedule' }, 403);
    }

    return c.json({ schedule: schedule.toJSON() });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return c.json({ error: 'Failed to fetch schedule' }, 500);
  }
}

/**
 * Update schedule metadata (name, timezone)
 */
export async function updateSchedule(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const body = await c.req.json<{ name?: string; timeZone?: string }>();
  const { name, timeZone } = body;

  if (!name && !timeZone) {
    return c.json({ error: 'At least one field (name or timeZone) is required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to modify this schedule' }, 403);
    }

    // Update schedule properties
    if (name !== undefined) {
      schedule.updateName(name);
    }
    if (timeZone !== undefined) {
      schedule.updateTimeZone(timeZone);
    }

    await uow.schedules.update(schedule);
    await uow.commit();
    return c.json({ schedule: schedule.toJSON() });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return c.json({ error: 'Failed to update schedule' }, 500);
  }
}

/**
 * Add a new schedule entry
 */
export async function addScheduleEntry(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const body = await c.req.json<{
    name: string;
    dayOfWeek: number;
    startTimeMinutes: number;
    durationMinutes: number;
  }>();
  const { name, dayOfWeek, startTimeMinutes, durationMinutes } = body;

  if (!name || dayOfWeek === undefined || startTimeMinutes === undefined || durationMinutes === undefined) {
    return c.json({ error: 'All fields are required: name, dayOfWeek, startTimeMinutes, durationMinutes' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to modify this schedule' }, 403);
    }

    const entry = new ScheduleEntry({
      id: crypto.randomUUID(), // Assign ID upfront for consistency
      name,
      dayOfWeek,
      startTimeMinutes,
      durationMinutes,
    });

    schedule.addEntry(entry);
    await uow.schedules.update(schedule);
    await uow.commit();
    return c.json({ schedule: schedule.toJSON() }, 201);
  } catch (error) {
    console.error('Error adding schedule entry:', error);
    return c.json({ error: 'Failed to add schedule entry' }, 500);
  }
}

/**
 * Update a schedule entry
 */
export async function updateScheduleEntry(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id, index } = c.req.param();
  if (!id || index === undefined) {
    return c.json({ error: 'Schedule ID and entry index are required' }, 400);
  }

  const entryIndex = parseInt(index, 10);
  if (isNaN(entryIndex)) {
    return c.json({ error: 'Entry index must be a number' }, 400);
  }

  const body = await c.req.json<{
    id?: string;
    name: string;
    dayOfWeek: number;
    startTimeMinutes: number;
    durationMinutes: number;
  }>();
  const { id: entryId, name, dayOfWeek, startTimeMinutes, durationMinutes } = body;

  console.log('[DEBUG] updateScheduleEntry received body:', body);
  console.log('[DEBUG] extracted entryId:', entryId);

  if (!name || dayOfWeek === undefined || startTimeMinutes === undefined || durationMinutes === undefined) {
    return c.json({ error: 'All fields are required: name, dayOfWeek, startTimeMinutes, durationMinutes' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to modify this schedule' }, 403);
    }

    if (entryIndex < 0 || entryIndex >= schedule.entries.length) {
      return c.json({ error: 'Entry index out of range' }, 400);
    }

    // Use the entry ID from the request body, or preserve the original if not provided
    const originalEntry = schedule.entries[entryIndex];
    console.log('[DEBUG] Original entry:', originalEntry.toJSON());
    
    const finalEntryId = entryId || originalEntry.id;
    console.log('[DEBUG] Final entry ID to use:', finalEntryId);
    
    const updatedEntry = new ScheduleEntry({
      id: finalEntryId, // Use ID from request body or preserve original
      name,
      dayOfWeek,
      startTimeMinutes,
      durationMinutes,
    });

    console.log('[DEBUG] Updated entry:', updatedEntry.toJSON());

    // Replace the entry at the specified index
    schedule.updateEntry(entryIndex, updatedEntry);
    
    console.log('[DEBUG] Schedule entries after update:', schedule.entries.map(e => e.toJSON()));

    await uow.schedules.update(schedule);
    await uow.commit();
    return c.json({ schedule: schedule.toJSON() });
  } catch (error) {
    console.error('Error updating schedule entry:', error);
    return c.json({ error: 'Failed to update schedule entry' }, 500);
  }
}

/**
 * Delete a schedule entry
 */
export async function deleteScheduleEntry(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id, index } = c.req.param();
  if (!id || index === undefined) {
    return c.json({ error: 'Schedule ID and entry index are required' }, 400);
  }

  const entryIndex = parseInt(index, 10);
  if (isNaN(entryIndex)) {
    return c.json({ error: 'Entry index must be a number' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to modify this schedule' }, 403);
    }

    if (entryIndex < 0 || entryIndex >= schedule.entries.length) {
      return c.json({ error: 'Entry index out of range' }, 400);
    }

    schedule.removeEntry(entryIndex);
    await uow.schedules.update(schedule);
    await uow.commit();
    return c.json({ schedule: schedule.toJSON() });
  } catch (error) {
    console.error('Error deleting schedule entry:', error);
    return c.json({ error: 'Failed to delete schedule entry' }, 500);
  }
}

/**
 * Delete a schedule and all its entries
 */
export async function deleteSchedule(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    // Only the owner can delete the schedule
    if (schedule.ownerId !== user.id) {
      return c.json({ error: 'Only the schedule owner can delete this schedule' }, 403);
    }

    await uow.schedules.delete(id);
    await uow.commit();
    return c.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return c.json({ error: 'Failed to delete schedule' }, 500);
  }
}

/**
 * Add a user to a schedule's shared users
 */
export async function addSharedUser(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const body = await c.req.json<{ email: string }>();
  const { email } = body;

  if (!email) {
    return c.json({ error: 'Email is required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    // Only the owner can manage sharing
    if (schedule.ownerId !== user.id) {
      return c.json({ error: 'Only the schedule owner can manage sharing' }, 403);
    }

    // Find the user by email
    const sharedUser = await uow.users.findByEmail(email);
    if (!sharedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Don't allow sharing with the owner
    if (sharedUser.id === schedule.ownerId) {
      return c.json({ error: 'Cannot share with the schedule owner' }, 400);
    }

    // Check if user is already shared
    if (schedule.sharedUserIds.includes(sharedUser.id)) {
      return c.json({ error: 'User is already shared with this schedule' }, 400);
    }

    schedule.shareWithUser(sharedUser.id);
    await uow.schedules.update(schedule);
    await uow.commit();
    
    return c.json({ schedule: schedule.toJSON() });
  } catch (error) {
    console.error('Error adding shared user:', error);
    return c.json({ error: 'Failed to add shared user' }, 500);
  }
}

/**
 * Remove a user from a schedule's shared users
 */
export async function removeSharedUser(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id, userId } = c.req.param();
  if (!id || !userId) {
    return c.json({ error: 'Schedule ID and user ID are required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    // Only the owner can manage sharing
    if (schedule.ownerId !== user.id) {
      return c.json({ error: 'Only the schedule owner can manage sharing' }, 403);
    }

    schedule.unshareWithUser(userId);
    await uow.schedules.update(schedule);
    await uow.commit();
    
    return c.json({ schedule: schedule.toJSON() });
  } catch (error) {
    console.error('Error removing shared user:', error);
    return c.json({ error: 'Failed to remove shared user' }, 500);
  }
}

/**
 * Get users who have access to a schedule (owner + shared users)
 */
export async function getScheduleUsers(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { id } = c.req.param();
  if (!id) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    const schedule = await uow.schedules.findById(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to view this schedule' }, 403);
    }

    // Get owner details
    const owner = await uow.users.findById(schedule.ownerId);
    if (!owner) {
      return c.json({ error: 'Schedule owner not found' }, 500);
    }

    // Get shared users details
    const sharedUsers = [];
    for (const userId of schedule.sharedUserIds) {
      const sharedUser = await uow.users.findById(userId);
      if (sharedUser) {
        sharedUsers.push(sharedUser.toJSON());
      }
    }

    return c.json({ 
      owner: owner.toJSON(), 
      sharedUsers 
    });
  } catch (error) {
    console.error('Error fetching schedule users:', error);
    return c.json({ error: 'Failed to fetch schedule users' }, 500);
  }
}

export const scheduleHandlers = {
  getSchedules,
  createSchedule,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  addScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  addSharedUser,
  removeSharedUser,
  getScheduleUsers,
};
