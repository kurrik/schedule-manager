import { ScheduleEntry } from './schedule-entry';

export interface SchedulePhaseProps {
  id: string;
  scheduleId: string;
  name?: string;
  startDate?: string; // ISO date (YYYY-MM-DD), undefined = infinite past
  endDate?: string;   // ISO date (YYYY-MM-DD), undefined = infinite future
  entries: ScheduleEntry[];
}

export class SchedulePhase {
  private props: SchedulePhaseProps;

  constructor(props: SchedulePhaseProps) {
    this.props = {
      ...props,
      entries: props.entries.map(entry => 
        entry instanceof ScheduleEntry ? entry : new ScheduleEntry(entry)
      )
    };
    this.validate();
  }

  private validate(): void {
    if (!this.props.id) throw new Error('SchedulePhase must have an ID');
    if (!this.props.scheduleId) throw new Error('SchedulePhase must have a schedule ID');
    
    // Validate date formats if provided
    if (this.props.startDate && !this.isValidISODate(this.props.startDate)) {
      throw new Error('Invalid startDate format, must be YYYY-MM-DD');
    }
    if (this.props.endDate && !this.isValidISODate(this.props.endDate)) {
      throw new Error('Invalid endDate format, must be YYYY-MM-DD');
    }
    
    // Validate date logic
    if (this.props.startDate && this.props.endDate) {
      if (this.props.startDate >= this.props.endDate) {
        throw new Error('startDate must be before endDate');
      }
    }
  }

  private isValidISODate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString + 'T00:00:00Z');
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }

  get id(): string { return this.props.id; }
  get scheduleId(): string { return this.props.scheduleId; }
  get name(): string | undefined { return this.props.name; }
  get startDate(): string | undefined { return this.props.startDate; }
  get endDate(): string | undefined { return this.props.endDate; }
  get entries(): ScheduleEntry[] { return [...this.props.entries]; }

  /**
   * Check if this phase is active on a given date
   */
  isActive(date: string): boolean {
    if (!this.isValidISODate(date)) {
      throw new Error('Invalid date format, must be YYYY-MM-DD');
    }

    // Check if date is before start date (if defined)
    if (this.props.startDate && date < this.props.startDate) {
      return false;
    }

    // Check if date is after end date (if defined)
    if (this.props.endDate && date > this.props.endDate) {
      return false;
    }

    return true;
  }

  /**
   * Check if this phase is currently active (today)
   */
  isCurrentlyActive(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.isActive(today);
  }

  /**
   * Get all entries that are active for a given date
   * (convenience method that combines phase and entry logic)
   */
  getActiveEntries(date: string): ScheduleEntry[] {
    if (!this.isActive(date)) {
      return [];
    }
    return this.entries;
  }

  /**
   * Add a new entry to this phase
   */
  addEntry(entry: ScheduleEntry): void {
    this.props.entries.push(entry);
  }

  /**
   * Remove an entry by index
   */
  removeEntry(entryIndex: number): void {
    if (entryIndex >= 0 && entryIndex < this.props.entries.length) {
      this.props.entries.splice(entryIndex, 1);
    }
  }

  /**
   * Update an entry at a specific index
   */
  updateEntry(entryIndex: number, newEntry: ScheduleEntry): void {
    if (entryIndex >= 0 && entryIndex < this.props.entries.length) {
      this.props.entries[entryIndex] = newEntry;
    }
  }

  /**
   * Update phase metadata
   */
  updateName(newName: string): void {
    this.props.name = newName;
  }

  /**
   * Update phase date range
   */
  updateDateRange(startDate?: string, endDate?: string): void {
    // Validate date formats if provided
    if (startDate && !this.isValidISODate(startDate)) {
      throw new Error('Invalid startDate format, must be YYYY-MM-DD');
    }
    if (endDate && !this.isValidISODate(endDate)) {
      throw new Error('Invalid endDate format, must be YYYY-MM-DD');
    }
    
    // Validate date logic
    if (startDate && endDate && startDate >= endDate) {
      throw new Error('startDate must be before endDate');
    }

    // If validation passes, update the actual properties
    this.props.startDate = startDate;
    this.props.endDate = endDate;
  }

  toJSON() {
    return {
      id: this.id,
      scheduleId: this.scheduleId,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      entries: this.entries.map(entry => 
        entry instanceof ScheduleEntry ? entry.toJSON() : entry
      ),
    };
  }
}