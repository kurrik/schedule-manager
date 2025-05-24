# Data Model Specification – Schedule Manager

## Overview
This document defines the core domain model for the Schedule Manager application, following Domain-Driven Design (DDD) principles. The domain model represents the business entities, their relationships, and behaviors needed to support user management, schedule sharing, recurring schedule entries, and schedule modifications.

---

## Domain Objects

### 1. User (Aggregate Root)
- **Purpose:** Represents an authenticated user of the application.
- **Properties:**
  - `id`: Unique user identifier
  - `email`: User's email address (from Google OAuth)
  - `displayName`: User's display name (from Google profile)
  - `profileImageUrl`: URL to user's profile image (from Google profile)

- **Behaviors:**
  - User accounts are automatically created/updated during Google OAuth sign-in
  - Users can own multiple schedules
  - Users can be granted shared access to schedules owned by others

---

### 2. Schedule (Aggregate Root)
- **Purpose:** Represents a schedule that contains recurring weekly entries and can be shared between users.
- **Properties:**
  - `id`: Unique schedule identifier
  - `ownerId`: User ID of the schedule owner
  - `sharedUserIds`: Array of user IDs with edit access
  - `name`: Custom schedule name
  - `timeZone`: IANA time zone identifier (e.g., "America/Los_Angeles")
  - `icalUrl`: Unique, unguessable URL token for public iCal feed
  - `entries`: Collection of schedule entries (embedded)

- **Behaviors:**
  - Owner has full control (can delete schedule, manage sharing)
  - Shared users can edit schedule metadata and entries
  - Access control enforced via `isAccessibleBy(userId)` method
  - Time zone changes affect display but preserve local times
  - Supports overlap prevention for entries within the same schedule
  - Generates public iCal feeds for calendar integration

---

### 3. ScheduleEntry (Value Object)
- **Purpose:** Represents a single recurring weekly task within a schedule.
- **Properties:**
  - `id`: Unique entry identifier
  - `name`: Entry name (e.g., "Pick up Ada from school")
  - `dayOfWeek`: Day of week (0–6, where 0 = Sunday)
  - `startTimeMinutes`: Minutes since midnight (0–1439), in 15-minute increments
  - `durationMinutes`: Duration in minutes, in 15-minute increments

- **Behaviors:**
  - Repeats weekly on the specified day and time
  - Validation ensures times are in 15-minute increments
  - Cannot overlap with other entries in the same schedule
  - Embedded within Schedule aggregate (not stored separately)

---

### 4. ScheduleOverride (Entity)
- **Purpose:** Represents a one-time modification or exception to a regular schedule for a specific date.
- **Properties:**
  - `id`: Unique override identifier
  - `scheduleId`: Reference to the parent schedule
  - `overrideDate`: Specific date for the override (ISO date format: YYYY-MM-DD)
  - `overrideType`: Type of override (MODIFY, SKIP, or ONE_TIME)
  - `baseEntryId`: Reference to the schedule entry being modified (for MODIFY/SKIP types)
  - `overrideData`: Type-specific modification data

- **Override Types:**
  - **MODIFY**: Modify an existing schedule entry for a specific date
    - Can change name, start time, and/or duration
    - Requires `baseEntryId` and modification data
  - **SKIP**: Skip an existing schedule entry for a specific date
    - Requires `baseEntryId` only
  - **ONE_TIME**: Add a one-time entry that doesn't normally exist
    - Requires complete entry data (name, start time, duration)
    - No `baseEntryId` needed

- **Behaviors:**
  - Applies only to the specified date
  - Takes precedence over regular schedule entries
  - Validation ensures time constraints (15-minute increments)
  - Can be queried by date range for calendar materialization

---

## Domain Relationships

### Ownership and Access
- A User can **own** multiple Schedules
- A Schedule can be **shared** with multiple Users
- Both owners and shared users can edit schedules and entries
- Only owners can delete schedules or manage sharing

### Composition
- Schedule **contains** multiple ScheduleEntry objects (embedded)
- Schedule can **have** multiple ScheduleOverride objects (separate entities)
- ScheduleOverride can **reference** a ScheduleEntry (for MODIFY/SKIP types)

### Data Integrity
- ScheduleEntry objects cannot overlap within the same schedule
- ScheduleOverride dates must be valid and properly formatted
- All time values must be in 15-minute increments
- IANA timezone identifiers must be valid

---

## Domain Services

### Calendar Materialization Service
- **Purpose:** Combines regular schedule entries with overrides to generate actual calendar events for a date range
- **Responsibilities:**
  - Apply overrides to base schedule entries
  - Handle timezone conversions
  - Generate final calendar events for display or export

### iCal Service
- **Purpose:** Generates standard iCal feeds from schedules
- **Responsibilities:**
  - Convert schedule entries to iCal recurring events
  - Apply proper timezone information
  - Generate RFC-compliant iCal format

---

## Domain Model Benefits

### Aggregate Design
- **Schedule and User are aggregate roots** - ensuring consistency boundaries
- **ScheduleEntry is a value object** - embedded for atomic updates
- **ScheduleOverride is a separate entity** - allowing independent lifecycle

### Business Rule Enforcement
- Time increment validation (15-minute boundaries)
- Overlap prevention within schedules
- Access control through domain methods
- Override type-specific validation

### Future Extensibility
- Override system ready for complex scheduling scenarios
- Repository pattern allows data storage flexibility
- Domain services can be extended for new features
- Clear separation between domain logic and infrastructure