import { ScheduleEntry } from './schedule-entry';
import { SchedulePhase } from './schedule-phase';

export interface ScheduleProps {
  id: string;
  ownerId: string;
  sharedUserIds: string[];
  name: string;
  timeZone: string;
  icalUrl: string;
  phases: SchedulePhase[];
}

export class Schedule {
  private props: ScheduleProps;

  constructor(props: ScheduleProps) {
    this.props = { 
      ...props, 
      sharedUserIds: [...props.sharedUserIds], 
      phases: props.phases.map(phase => 
        phase instanceof SchedulePhase ? phase : new SchedulePhase(phase)
      )
    };
    
    // Ensure schedule has at least one phase (backward compatibility)
    if (this.props.phases.length === 0) {
      console.log('[DEBUG] Schedule has no phases, creating default phase');
      const defaultPhase = new SchedulePhase({
        id: `default-${this.props.id}`,
        scheduleId: this.props.id,
        name: 'Default Phase',
        entries: []
      });
      this.props.phases.push(defaultPhase);
    }
    
    this.validate();
  }

  private validate(): void {
    if (!this.props.id) throw new Error('Schedule must have an ID');
    if (!this.props.ownerId) throw new Error('Schedule must have an owner');
    if (!this.props.timeZone) throw new Error('Schedule must have a timezone');
    if (!this.props.icalUrl) throw new Error('Schedule must have an iCal URL');
    if (!Intl.supportedValuesOf('timeZone').includes(this.props.timeZone)) {
      throw new Error('Invalid timezone');
    }
  }

  get id(): string { return this.props.id; }
  get ownerId(): string { return this.props.ownerId; }
  get sharedUserIds(): string[] { return [...this.props.sharedUserIds]; }
  get name(): string { return this.props.name; }
  get timeZone(): string { return this.props.timeZone; }
  get icalUrl(): string { return this.props.icalUrl; }
  get phases(): SchedulePhase[] { return [...this.props.phases]; }

  isAccessibleBy(userId: string): boolean {
    return this.ownerId === userId || this.sharedUserIds.includes(userId);
  }

  addPhase(phase: SchedulePhase): void {
    this.props.phases.push(phase);
  }

  removePhase(phaseIndex: number): void {
    if (phaseIndex >= 0 && phaseIndex < this.props.phases.length) {
      this.props.phases.splice(phaseIndex, 1);
    }
  }

  updatePhase(phaseIndex: number, newPhase: SchedulePhase): void {
    if (phaseIndex >= 0 && phaseIndex < this.props.phases.length) {
      this.props.phases[phaseIndex] = newPhase;
    }
  }

  shareWithUser(userId: string): void {
    if (!this.sharedUserIds.includes(userId)) {
      this.props.sharedUserIds.push(userId);
    }
  }

  unshareWithUser(userId: string): void {
    this.props.sharedUserIds = this.props.sharedUserIds.filter(id => id !== userId);
  }

  updateName(newName: string): void {
    this.props.name = newName;
  }

  updateTimeZone(newTimeZone: string): void {
    if (!Intl.supportedValuesOf('timeZone').includes(newTimeZone)) {
      throw new Error('Invalid timezone');
    }
    this.props.timeZone = newTimeZone;
  }

  // Backward compatibility methods for entries (delegate to default phase)
  get entries(): ScheduleEntry[] {
    const defaultPhase = this.getDefaultPhase();
    return defaultPhase ? defaultPhase.entries : [];
  }

  addEntry(entry: ScheduleEntry): void {
    let defaultPhase = this.getDefaultPhase();
    if (!defaultPhase) {
      // Create default phase if none exists
      defaultPhase = new SchedulePhase({
        id: `default-${this.id}`,
        scheduleId: this.id,
        name: 'Default Phase',
        entries: []
      });
      this.addPhase(defaultPhase);
    }
    defaultPhase.addEntry(entry);
  }

  removeEntry(entryIndex: number): void {
    const defaultPhase = this.getDefaultPhase();
    if (defaultPhase) {
      defaultPhase.removeEntry(entryIndex);
    }
  }

  updateEntry(entryIndex: number, newEntry: ScheduleEntry): void {
    const defaultPhase = this.getDefaultPhase();
    if (defaultPhase) {
      defaultPhase.updateEntry(entryIndex, newEntry);
    }
  }

  private getDefaultPhase(): SchedulePhase | null {
    // Find phase with no start/end dates or specifically named "Default Phase"
    return this.props.phases.find(phase => 
      (!phase.startDate && !phase.endDate) || 
      phase.name === 'Default Phase'
    ) || null;
  }

  /**
   * Get all phases that are active on a given date
   */
  getActivePhasesForDate(date: string): SchedulePhase[] {
    return this.props.phases.filter(phase => phase.isActive(date));
  }

  /**
   * Get all entries from all phases that are active on a given date
   */
  getActiveEntriesForDate(date: string): ScheduleEntry[] {
    const activePhases = this.getActivePhasesForDate(date);
    const allEntries: ScheduleEntry[] = [];
    
    for (const phase of activePhases) {
      allEntries.push(...phase.entries);
    }
    
    return allEntries;
  }

  /**
   * Get currently active phases (today)
   */
  getCurrentlyActivePhases(): SchedulePhase[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getActivePhasesForDate(today);
  }

  /**
   * Find a phase by ID
   */
  findPhaseById(phaseId: string): SchedulePhase | null {
    return this.props.phases.find(phase => phase.id === phaseId) || null;
  }

  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      sharedUserIds: this.sharedUserIds,
      name: this.name,
      timeZone: this.timeZone,
      icalUrl: this.icalUrl,
      phases: this.phases.map(phase => 
        phase instanceof SchedulePhase ? phase.toJSON() : phase
      ),
      // Backward compatibility: include entries from default phase
      entries: this.entries.map(entry => 
        entry instanceof ScheduleEntry ? entry.toJSON() : entry
      ),
    };
  }
}
