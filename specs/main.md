# Schedule Manager – Developer Specification

## Overview
Schedule Manager is a chore/task scheduling web app for managing weekly recurring tasks (e.g., drop-off/pick-up times for children) with shared editing and iCal export. The app is designed for privacy, simplicity, and collaborative scheduling between multiple users.

---

## 1. Core Requirements

### 1.1 Users & Authentication
- Users authenticate via Google using [hono-simple-google-auth](https://www.npmjs.com/package/hono-simple-google-auth).
- Each user has a display name and profile image (from Google profile).
- All users can create, own, and share schedules.

### 1.2 Schedules
- Each schedule has:
  - An owner (user ID)
  - Zero or more shared users (user IDs)
  - A custom name
  - A time zone (configurable, can be changed at any time)
  - A unique, unguessable public iCal feed URL
  - A list of weekly recurring tasks
- Only the owner can delete a schedule (immediate, permanent deletion).
- All users with access (owner + shared) can edit schedules and tasks.
- All schedules and tasks are private, except for the public iCal feed.
- Users can create unlimited schedules.

### 1.3 Tasks (Schedule Entries)
- Each task has:
  - Name (e.g., "Arne pick up Ada")
  - Day of week (Sunday–Saturday)
  - Start time (any 15-minute interval, 24h)
  - Duration (15-minute increments)
- No overlapping tasks allowed within a schedule.
- All tasks repeat weekly, forever, with no exceptions.
- Tasks are only editable/deletable individually (no bulk actions).

### 1.4 Weekly View
- Grid layout (like a calendar week view), always starting on Sunday.
- Users can view and edit tasks for any day of the week.
- When the schedule time zone is changed, all tasks retain their local time (e.g., 9am stays 9am in the new zone).

### 1.5 iCal Feed
- Each schedule exposes a unique, unguessable iCal feed URL.
- Feed contains all tasks as standard recurring weekly events (no customizations).
- No option to regenerate/revoke URLs for now.

### 1.6 Schedule List
- Users see a list of their schedules (owned or shared), showing:
  - Schedule name
  - Owner
  - Time zone
  - Number of tasks
  - Last modified date
- Anyone with access to a schedule can see the list of shared users.

### 1.7 General
- English only; no localization needed.
- No notifications/reminders; iCal is the only export/reminder mechanism.
- No audit log or activity history.
- No schedule duplication.

---

## 2. Architecture Choices

### 2.1 Tech Stack
- Backend: Hono (Node.js/TypeScript)
- Auth: hono-simple-google-auth
- Database: (suggested) PostgreSQL or SQLite
- Frontend: React (or another SPA framework)
- iCal Generation: ical.js or similar

### 2.2 Data Model (Simplified)

#### User
- id (string, from Google)
- display_name (string)
- profile_image_url (string)

#### Schedule
- id (uuid)
- owner_id (user.id)
- shared_user_ids (array of user.id)
- name (string)
- timezone (IANA string)
- ical_url (unguessable string)
- created_at, updated_at (timestamps)

#### Task
- id (uuid)
- schedule_id (schedule.id)
- name (string)
- day_of_week (0–6, Sunday=0)
- start_time (minutes since midnight, 0–1439, 15-min increments)
- duration_mins (15-min increments)
- created_at, updated_at (timestamps)

---

## 3. Data Handling & Privacy
- All data is private to the owner and shared users, except the iCal feed.
- iCal URLs must be unguessable (e.g., UUIDv4 or similar random token).
- All schedule/task modifications are restricted to users with access.
- No public discoverability of schedules or users.

---

## 4. Error Handling Strategies
- Prevent creation of overlapping tasks within a schedule (validate on both client and server).
- Return clear error messages for permission errors (e.g., unauthorized edit/delete attempts).
- Handle invalid iCal URL requests with a generic 404.
- Validate time zone strings and enforce 15-min increments for times/durations.
- Graceful handling of network/database errors with user-friendly messages.

---

## 5. Testing Plan

### 5.1 Unit Tests
- User authentication flow (Google sign-in, session management)
- CRUD operations for schedules and tasks
- Time zone change logic (tasks retain local time)
- Overlap prevention logic
- iCal feed generation

### 5.2 Integration Tests
- Full schedule/task lifecycle (create, edit, delete, share)
- Permissions enforcement (owner vs. shared user actions)
- iCal feed access and correctness

### 5.3 UI/UX Tests
- Weekly grid view rendering and interaction
- Task creation/editing/deletion
- Responsive design (desktop/mobile)

### 5.4 Manual QA
- Google sign-in with multiple accounts
- Schedule sharing and access
- iCal feed import into Google Calendar

---

## 6. Future Considerations (Out of Scope for MVP)
- Schedule sharing invitations/links
- Schedule duplication
- Bulk task actions
- Notifications/reminders
- Localization
- Audit logs
- Role-based permissions (viewer/editor)
- iCal feed revocation/regeneration

---

## 7. Developer Notes
- Use environment variables for secrets (Google OAuth, DB, etc.)
- Document API endpoints and data contracts
- Prioritize accessibility and keyboard navigation
- Ensure unguessable iCal URLs are never exposed in user search or listings

---

This specification is intended to be immediately actionable for implementation. If questions arise, please refer to the Q&A history or clarify with the product owner.
