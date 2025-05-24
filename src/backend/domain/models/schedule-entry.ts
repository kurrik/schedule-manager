export interface ScheduleEntryProps {
  id?: string; // Optional for new entries, required for existing entries
  name: string;
  dayOfWeek: number; // 0-6 where 0 is Sunday
  startTimeMinutes: number; // Minutes since midnight (0-1439)
  durationMinutes: number; // Duration in minutes (15-min increments)
}

export class ScheduleEntry {
  private readonly props: ScheduleEntryProps;

  constructor(props: ScheduleEntryProps) {
    this.props = { ...props };
    this.validate();
  }

  private validate(): void {
    if (this.props.dayOfWeek < 0 || this.props.dayOfWeek > 6) {
      throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    }
    
    if (this.props.startTimeMinutes < 0 || this.props.startTimeMinutes > 1439) {
      throw new Error('Start time must be between 0 and 1439 minutes');
    }
    
    if (this.props.durationMinutes <= 0 || this.props.durationMinutes % 15 !== 0) {
      throw new Error('Duration must be a positive multiple of 15 minutes');
    }
  }

  get name(): string {
    return this.props.name;
  }

  get dayOfWeek(): number {
    return this.props.dayOfWeek;
  }

  get startTimeMinutes(): number {
    return this.props.startTimeMinutes;
  }

  get durationMinutes(): number {
    return this.props.durationMinutes;
  }

  get id(): string | undefined {
    return this.props.id;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      dayOfWeek: this.dayOfWeek,
      startTimeMinutes: this.startTimeMinutes,
      durationMinutes: this.durationMinutes,
    };
  }
}
