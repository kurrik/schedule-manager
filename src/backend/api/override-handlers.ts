import type { Context } from 'hono';
import type { Env } from '../main';
import { D1UnitOfWork } from '../infrastructure/unit-of-work/d1-unit-of-work';
import { ScheduleOverride, type OverrideType } from '../domain/models/schedule-override';

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
 * Get all overrides for a schedule
 */
export async function getScheduleOverrides(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { scheduleId } = c.req.param();
  if (!scheduleId) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    // Verify user has access to the schedule
    const schedule = await uow.schedules.findById(scheduleId);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to view this schedule' }, 403);
    }

    const overrides = await uow.overrides.findByScheduleId(scheduleId);
    return c.json({ overrides: overrides.map(o => o.toJSON()) });
  } catch (error) {
    console.error('Error fetching overrides:', error);
    return c.json({ error: 'Failed to fetch overrides' }, 500);
  }
}

/**
 * Get overrides for a schedule within a date range
 */
export async function getScheduleOverridesInRange(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { scheduleId } = c.req.param();
  const { startDate, endDate } = c.req.query();

  if (!scheduleId) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  if (!startDate || !endDate) {
    return c.json({ error: 'Start date and end date are required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    // Verify user has access to the schedule
    const schedule = await uow.schedules.findById(scheduleId);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to view this schedule' }, 403);
    }

    const overrides = await uow.overrides.findByScheduleIdAndDateRange(scheduleId, startDate, endDate);
    return c.json({ overrides: overrides.map(o => o.toJSON()) });
  } catch (error) {
    console.error('Error fetching overrides:', error);
    return c.json({ error: 'Failed to fetch overrides' }, 500);
  }
}

/**
 * Create a new override
 */
export async function createOverride(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { scheduleId } = c.req.param();
  if (!scheduleId) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const body = await c.req.json<{
    overrideDate: string;
    overrideType: OverrideType;
    baseEntryId?: string;
    overrideData?: any;
  }>();

  const { overrideDate, overrideType, baseEntryId, overrideData } = body;

  if (!overrideDate || !overrideType) {
    return c.json({ error: 'Override date and type are required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    // Verify user has access to the schedule
    const schedule = await uow.schedules.findById(scheduleId);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to modify this schedule' }, 403);
    }

    // For MODIFY/SKIP overrides, verify the base entry exists
    if ((overrideType === 'MODIFY' || overrideType === 'SKIP') && baseEntryId) {
      const entryExists = schedule.entries.some(entry => entry.id === baseEntryId);
      if (!entryExists) {
        return c.json({ error: 'Base entry not found' }, 400);
      }
    }

    const override = new ScheduleOverride({
      id: crypto.randomUUID(),
      scheduleId,
      overrideDate,
      overrideType,
      baseEntryId,
      overrideData,
    });

    await uow.overrides.save(override);
    await uow.commit();

    return c.json({ override: override.toJSON() }, 201);
  } catch (error) {
    console.error('Error creating override:', error);
    const message = error instanceof Error ? error.message : 'Failed to create override';
    return c.json({ error: message }, 500);
  }
}

/**
 * Update an existing override
 */
export async function updateOverride(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { overrideId } = c.req.param();
  if (!overrideId) {
    return c.json({ error: 'Override ID is required' }, 400);
  }

  const body = await c.req.json<{
    overrideDate?: string;
    overrideType?: OverrideType;
    baseEntryId?: string;
    overrideData?: any;
  }>();

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    // Get existing override
    const existingOverride = await uow.overrides.findById(overrideId);
    if (!existingOverride) {
      return c.json({ error: 'Override not found' }, 404);
    }

    // Verify user has access to the schedule
    const schedule = await uow.schedules.findById(existingOverride.scheduleId);
    if (!schedule || !schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to modify this override' }, 403);
    }

    // Create updated override
    const updatedOverride = new ScheduleOverride({
      id: existingOverride.id,
      scheduleId: existingOverride.scheduleId,
      overrideDate: body.overrideDate ?? existingOverride.overrideDate,
      overrideType: body.overrideType ?? existingOverride.overrideType,
      baseEntryId: body.baseEntryId ?? existingOverride.baseEntryId,
      overrideData: body.overrideData ?? existingOverride.overrideData,
    });

    await uow.overrides.save(updatedOverride);
    await uow.commit();

    return c.json({ override: updatedOverride.toJSON() });
  } catch (error) {
    console.error('Error updating override:', error);
    const message = error instanceof Error ? error.message : 'Failed to update override';
    return c.json({ error: message }, 500);
  }
}

/**
 * Delete an override
 */
export async function deleteOverride(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { overrideId } = c.req.param();
  if (!overrideId) {
    return c.json({ error: 'Override ID is required' }, 400);
  }

  const uow = new D1UnitOfWork(c.env.DB);
  try {
    // Get existing override
    const existingOverride = await uow.overrides.findById(overrideId);
    if (!existingOverride) {
      return c.json({ error: 'Override not found' }, 404);
    }

    // Verify user has access to the schedule
    const schedule = await uow.schedules.findById(existingOverride.scheduleId);
    if (!schedule || !schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to delete this override' }, 403);
    }

    await uow.overrides.delete(overrideId);
    await uow.commit();

    return c.json({ message: 'Override deleted successfully' });
  } catch (error) {
    console.error('Error deleting override:', error);
    return c.json({ error: 'Failed to delete override' }, 500);
  }
}

export const overrideHandlers = {
  getScheduleOverrides,
  getScheduleOverridesInRange,
  createOverride,
  updateOverride,
  deleteOverride,
};