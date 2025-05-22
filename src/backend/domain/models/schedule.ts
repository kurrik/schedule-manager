import { ScheduleEntry } from './schedule-entry';

export interface ScheduleProps {
  id: string;
  ownerId: string;
  sharedUserIds: string[];
  name: string;
  timeZone: string;
  icalUrl: string;
  entries: ScheduleEntry[];
}

export class Schedule {
  private props: ScheduleProps;

  constructor(props: ScheduleProps) {
    this.props = { ...props, sharedUserIds: [...props.sharedUserIds], entries: [...props.entries] };
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
  get entries(): ScheduleEntry[] { return [...this.props.entries]; }

  isAccessibleBy(userId: string): boolean {
    return this.ownerId === userId || this.sharedUserIds.includes(userId);
  }

  addEntry(entry: ScheduleEntry): void {
    this.props.entries.push(entry);
  }

  removeEntry(entryIndex: number): void {
    if (entryIndex >= 0 && entryIndex < this.props.entries.length) {
      this.props.entries.splice(entryIndex, 1);
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

  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      sharedUserIds: this.sharedUserIds,
      name: this.name,
      timeZone: this.timeZone,
      icalUrl: this.icalUrl,
      entries: this.entries.map(entry => entry.toJSON()),
    };
  }
}
