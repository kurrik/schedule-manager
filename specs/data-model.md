# Data Model Specification – Schedule Manager

## Overview
This document defines the core data model for the Schedule Manager application, following Domain-Driven Design (DDD) best practices with a bias toward simplicity. The data model is designed for use with Cloudflare KV and is structured to support the app’s requirements for user management, schedule sharing, and recurring schedule entries.

---

## Core Aggregates and Entities

### 1. User (Aggregate Root)
- **Purpose:** Represents an authenticated user of the app.
- **Fields:**
  - `id` (string): Google account ID (unique, required)
  - `displayName` (string): User’s display name (from Google profile)
  - `profileImageUrl` (string): URL to user’s profile image (from Google profile)

---

### 2. Schedule (Aggregate Root)
- **Purpose:** Represents a schedule, which can be owned and shared with users.
- **Fields:**
  - `id` (string): Unique schedule identifier (e.g., UUID or similar)
  - `ownerId` (string): User ID of the schedule owner
  - `sharedUserIds` (string[]): Array of user IDs with edit access
  - `name` (string): Custom schedule name
  - `timeZone` (string): IANA time zone identifier (e.g., "America/Los_Angeles")
  - `icalUrl` (string): Unique, unguessable URL token for public iCal feed
  - `entries` (ScheduleEntry[]): Array of schedule entries (embedded, see below)

---

### 3. ScheduleEntry (Value Object)
- **Purpose:** Represents a single recurring entry within a schedule.
- **Fields:**
  - `name` (string): Entry name (e.g., "Arne pick up Ada")
  - `dayOfWeek` (number): 0–6, where 0 = Sunday
  - `startTimeMinutes` (number): Minutes since midnight (0–1439), 15-min increments
  - `durationMinutes` (number): Duration in minutes (15-min increments)

---

## Relationships
- A User may own multiple Schedules.
- A Schedule may be shared with multiple Users (by user ID).
- ScheduleEntry objects are embedded directly within the parent Schedule aggregate (not stored separately).

---

## Storage in Cloudflare KV
- **User objects:**
  - Key: `user:<id>`
  - Value: JSON-serialized User entity
- **Schedule objects:**
  - Key: `schedule:<id>`
  - Value: JSON-serialized Schedule aggregate (including embedded entries)

---

## Notes on DDD and Simplicity
- Schedule and User are aggregate roots; ScheduleEntry is a value object embedded in Schedule.
- No additional metadata (timestamps, audit, etc.) is stored unless requirements change.
- This structure is optimized for simplicity, fast lookups, and atomic updates to schedules and their entries.

---

## Example JSON Structures

**User:**
```json
{
  "id": "google-oauth2|1234567890",
  "displayName": "Ada Lovelace",
  "profileImageUrl": "https://lh3.googleusercontent.com/a-/AOh14Gg..."
}
```

**Schedule:**
```json
{
  "id": "sch_abc123",
  "ownerId": "google-oauth2|1234567890",
  "sharedUserIds": ["google-oauth2|2345678901"],
  "name": "School Pickups",
  "timeZone": "America/Los_Angeles",
  "icalUrl": "ical_8f8e2c4b...",
  "entries": [
    {
      "name": "Arne pick up Ada",
      "dayOfWeek": 1,
      "startTimeMinutes": 900,
      "durationMinutes": 30
    }
  ]
}
```

---

This data model is ready for implementation. If requirements evolve, further DDD layers (e.g., repositories, domain services) can be introduced as needed.
