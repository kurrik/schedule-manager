export type OverrideType = 'MODIFY' | 'SKIP' | 'ONE_TIME';

export interface ModifyOverrideData {
  name?: string;
  startTimeMinutes?: number;
  durationMinutes?: number;
}

export interface OneTimeOverrideData {
  name: string;
  startTimeMinutes: number;
  durationMinutes: number;
}

export interface ScheduleOverrideProps {
  id: string;
  scheduleId: string;
  overrideDate: string; // ISO date string (YYYY-MM-DD)
  overrideType: OverrideType;
  baseEntryId?: string; // For MODIFY/SKIP - references schedule_entries.id
  overrideData?: ModifyOverrideData | OneTimeOverrideData; // Type-specific data
}

export class ScheduleOverride {
  private readonly props: ScheduleOverrideProps;

  constructor(props: ScheduleOverrideProps) {
    this.props = { ...props };
    this.validate();
  }

  private validate(): void {
    if (!this.props.id) {
      throw new Error('Override must have an ID');
    }
    
    if (!this.props.scheduleId) {
      throw new Error('Override must have a schedule ID');
    }
    
    if (!this.props.overrideDate) {
      throw new Error('Override must have a date');
    }
    
    // Validate ISO date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(this.props.overrideDate)) {
      throw new Error('Override date must be in YYYY-MM-DD format');
    }
    
    // Validate date is actually a valid date
    const date = new Date(this.props.overrideDate + 'T00:00:00.000Z');
    if (isNaN(date.getTime())) {
      throw new Error('Override date must be a valid date');
    }
    
    if (!['MODIFY', 'SKIP', 'ONE_TIME'].includes(this.props.overrideType)) {
      throw new Error('Override type must be MODIFY, SKIP, or ONE_TIME');
    }
    
    // Type-specific validations
    if (this.props.overrideType === 'MODIFY') {
      this.validateModifyOverride();
    } else if (this.props.overrideType === 'SKIP') {
      this.validateSkipOverride();
    } else if (this.props.overrideType === 'ONE_TIME') {
      this.validateOneTimeOverride();
    }
  }

  private validateModifyOverride(): void {
    if (!this.props.baseEntryId) {
      throw new Error('MODIFY override must have a baseEntryId');
    }
    
    if (!this.props.overrideData) {
      throw new Error('MODIFY override must have override data');
    }
    
    const data = this.props.overrideData as ModifyOverrideData;
    
    // At least one field must be overridden
    if (!data.name && data.startTimeMinutes === undefined && data.durationMinutes === undefined) {
      throw new Error('MODIFY override must specify at least one field to modify');
    }
    
    // Validate time fields if provided
    if (data.startTimeMinutes !== undefined) {
      if (data.startTimeMinutes < 0 || data.startTimeMinutes > 1439) {
        throw new Error('Start time must be between 0 and 1439 minutes');
      }
      if (data.startTimeMinutes % 15 !== 0) {
        throw new Error('Start time must be in 15-minute increments');
      }
    }
    
    if (data.durationMinutes !== undefined) {
      if (data.durationMinutes <= 0 || data.durationMinutes % 15 !== 0) {
        throw new Error('Duration must be a positive multiple of 15 minutes');
      }
    }
  }

  private validateSkipOverride(): void {
    if (!this.props.baseEntryId) {
      throw new Error('SKIP override must have a baseEntryId');
    }
    
    // SKIP overrides shouldn't have override data
    if (this.props.overrideData) {
      throw new Error('SKIP override should not have override data');
    }
  }

  private validateOneTimeOverride(): void {
    if (this.props.baseEntryId) {
      throw new Error('ONE_TIME override should not have a baseEntryId');
    }
    
    if (!this.props.overrideData) {
      throw new Error('ONE_TIME override must have override data');
    }
    
    const data = this.props.overrideData as OneTimeOverrideData;
    
    if (!data.name) {
      throw new Error('ONE_TIME override must have a name');
    }
    
    if (data.startTimeMinutes === undefined) {
      throw new Error('ONE_TIME override must have a start time');
    }
    
    if (data.durationMinutes === undefined) {
      throw new Error('ONE_TIME override must have a duration');
    }
    
    // Validate time fields
    if (data.startTimeMinutes < 0 || data.startTimeMinutes > 1439) {
      throw new Error('Start time must be between 0 and 1439 minutes');
    }
    
    if (data.startTimeMinutes % 15 !== 0) {
      throw new Error('Start time must be in 15-minute increments');
    }
    
    if (data.durationMinutes <= 0 || data.durationMinutes % 15 !== 0) {
      throw new Error('Duration must be a positive multiple of 15 minutes');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get scheduleId(): string {
    return this.props.scheduleId;
  }

  get overrideDate(): string {
    return this.props.overrideDate;
  }

  get overrideType(): OverrideType {
    return this.props.overrideType;
  }

  get baseEntryId(): string | undefined {
    return this.props.baseEntryId;
  }

  get overrideData(): ModifyOverrideData | OneTimeOverrideData | undefined {
    return this.props.overrideData;
  }

  // Helper methods
  isModifyOverride(): this is ScheduleOverride & { overrideData: ModifyOverrideData } {
    return this.props.overrideType === 'MODIFY';
  }

  isSkipOverride(): boolean {
    return this.props.overrideType === 'SKIP';
  }

  isOneTimeOverride(): this is ScheduleOverride & { overrideData: OneTimeOverrideData } {
    return this.props.overrideType === 'ONE_TIME';
  }

  // Get the date as a Date object
  getDate(): Date {
    return new Date(this.props.overrideDate + 'T00:00:00.000Z');
  }

  // Check if this override applies to a specific date
  appliesTo(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === this.props.overrideDate;
  }

  toJSON(): ScheduleOverrideProps {
    return {
      id: this.id,
      scheduleId: this.scheduleId,
      overrideDate: this.overrideDate,
      overrideType: this.overrideType,
      baseEntryId: this.baseEntryId,
      overrideData: this.overrideData,
    };
  }
}