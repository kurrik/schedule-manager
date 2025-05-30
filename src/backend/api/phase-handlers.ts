import type { Context } from 'hono';
import type { Env } from '../main';
import { D1UnitOfWork } from '../infrastructure/unit-of-work/d1-unit-of-work';
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
 * Get all phases for a schedule
 */
export async function getSchedulePhases(c: Context<AppContext>) {
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

    const phases = await uow.phases.findByScheduleId(scheduleId);
    return c.json({ phases: phases.map(p => p.toJSON()) });
  } catch (error) {
    console.error('Error fetching phases:', error);
    return c.json({ error: 'Failed to fetch phases' }, 500);
  }
}

/**
 * Create a new phase for a schedule
 */
export async function createSchedulePhase(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { scheduleId } = c.req.param();
  if (!scheduleId) {
    return c.json({ error: 'Schedule ID is required' }, 400);
  }

  const body = await c.req.json<{ 
    name?: string; 
    startDate?: string; 
    endDate?: string; 
  }>();

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

    // Create new phase
    const phase = new SchedulePhase({
      id: crypto.randomUUID(),
      scheduleId: scheduleId,
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      entries: []
    });

    console.log('[DEBUG] Creating phase:', phase.toJSON());
    await uow.phases.create(phase);
    await uow.commit();
    
    return c.json({ phase: phase.toJSON() }, 201);
  } catch (error) {
    console.error('Error creating phase:', error);
    return c.json({ error: 'Failed to create phase' }, 500);
  }
}

/**
 * Update a phase
 */
export async function updateSchedulePhase(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { scheduleId, phaseId } = c.req.param();
  if (!scheduleId || !phaseId) {
    return c.json({ error: 'Schedule ID and Phase ID are required' }, 400);
  }

  const body = await c.req.json<{ 
    name?: string; 
    startDate?: string; 
    endDate?: string; 
  }>();

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

    // Get the phase to update
    const phase = await uow.phases.findById(phaseId);
    if (!phase) {
      return c.json({ error: 'Phase not found' }, 404);
    }

    // Verify the phase belongs to the schedule
    if (phase.scheduleId !== scheduleId) {
      return c.json({ error: 'Phase does not belong to this schedule' }, 400);
    }

    // Update phase metadata
    if (body.name !== undefined) {
      phase.updateName(body.name);
    }
    
    if (body.startDate !== undefined || body.endDate !== undefined) {
      phase.updateDateRange(body.startDate, body.endDate);
    }

    console.log('[DEBUG] Updating phase:', phase.toJSON());
    await uow.phases.update(phase);
    await uow.commit();
    
    return c.json({ phase: phase.toJSON() });
  } catch (error) {
    console.error('Error updating phase:', error);
    return c.json({ error: 'Failed to update phase' }, 500);
  }
}

/**
 * Delete a phase
 */
export async function deleteSchedulePhase(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { scheduleId, phaseId } = c.req.param();
  if (!scheduleId || !phaseId) {
    return c.json({ error: 'Schedule ID and Phase ID are required' }, 400);
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

    // Check that we're not deleting the last phase
    const allPhases = await uow.phases.findByScheduleId(scheduleId);
    if (allPhases.length <= 1) {
      return c.json({ error: 'Cannot delete the last phase. Schedules must have at least one phase.' }, 400);
    }

    // Get the phase to delete
    const phase = await uow.phases.findById(phaseId);
    if (!phase) {
      return c.json({ error: 'Phase not found' }, 404);
    }

    // Verify the phase belongs to the schedule
    if (phase.scheduleId !== scheduleId) {
      return c.json({ error: 'Phase does not belong to this schedule' }, 400);
    }

    console.log('[DEBUG] Deleting phase:', phaseId);
    await uow.phases.delete(phaseId);
    await uow.commit();
    
    return c.json({ message: 'Phase deleted successfully' });
  } catch (error) {
    console.error('Error deleting phase:', error);
    return c.json({ error: 'Failed to delete phase' }, 500);
  }
}

/**
 * Add an entry to a specific phase
 */
export async function addPhaseEntry(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const { scheduleId, phaseId } = c.req.param();
  if (!scheduleId || !phaseId) {
    return c.json({ error: 'Schedule ID and Phase ID are required' }, 400);
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
    // Verify user has access to the schedule
    const schedule = await uow.schedules.findById(scheduleId);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    if (!schedule.isAccessibleBy(user.id)) {
      return c.json({ error: 'Not authorized to modify this schedule' }, 403);
    }

    // Get the specific phase
    const phase = await uow.phases.findById(phaseId);
    if (!phase) {
      return c.json({ error: 'Phase not found' }, 404);
    }

    // Verify the phase belongs to the schedule
    if (phase.scheduleId !== scheduleId) {
      return c.json({ error: 'Phase does not belong to this schedule' }, 400);
    }

    // Create the new entry
    const entry = new ScheduleEntry({
      id: crypto.randomUUID(),
      name,
      dayOfWeek,
      startTimeMinutes,
      durationMinutes,
    });

    // Add entry to the specific phase
    phase.addEntry(entry);
    await uow.phases.update(phase);
    await uow.commit();
    
    return c.json({ phase: phase.toJSON() }, 201);
  } catch (error) {
    console.error('Error adding entry to phase:', error);
    return c.json({ error: 'Failed to add entry to phase' }, 500);
  }
}

export const phaseHandlers = {
  getSchedulePhases,
  createSchedulePhase,
  updateSchedulePhase,
  deleteSchedulePhase,
  addPhaseEntry,
};