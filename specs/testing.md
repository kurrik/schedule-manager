# Testing Specification – Schedule Manager

## Overview
This document describes the testing strategy and requirements for the Schedule Manager app. The approach combines end-to-end (E2E) tests for core user workflows and unit tests for business logic and repositories, following the principle of minimizing mocks and using realistic test environments.

---

## 1. Testing Goals
- Ensure reliability of core user workflows via E2E tests
- Validate correctness of business logic and DDD repositories via unit tests
- Use realistic environments (wrangler local KV) to minimize mocking

---

## 2. End-to-End (E2E) Tests

### Tools
- Recommended: Playwright or Cypress for browser automation
- Run tests against local Worker (dev mode)

### Core Workflows to Cover

#### Basic Schedule Management
1. **User Sign In**
   - Simulate Google sign-in flow
   - Verify authenticated session is established
2. **Create Schedule**
   - User creates a new schedule (name, time zone)
   - Verify schedule appears in user's list
3. **Update Schedule Name**
   - User edits an existing schedule's name
   - Verify updated name appears in schedule list and detail view
4. **Add Schedule Entries**
   - User adds one or more entries to a schedule
   - Verify entries are displayed in the weekly view

#### Schedule Entry Management
5. **Update Schedule Entry**
   - User edits an existing entry (name, time, duration, day)
   - Verify updated entry reflects changes in the weekly view
6. **Delete Schedule Entry**
   - User deletes an entry from a schedule
   - Verify entry is removed from the weekly view

#### Phase Management
7. **Split Schedule into Another Phase**
   - User splits an existing phase at a specific transition date
   - Verify original phase ends at transition date
   - Verify new phase starts at transition date with correct name
8. **Add Entry to New Phase**
   - User adds entries to a newly created phase
   - Verify entries appear in the correct phase context
9. **Delete Phase**
   - User deletes a non-default phase
   - Verify phase and its entries are removed
   - Verify cannot delete the last remaining phase

#### Phase Date Validation
10. **Validate Phase Date Restrictions**
    - Create phases with specific start/end dates
    - Verify entries only appear in weekly view when phase is active
    - Test edge cases around phase transition dates

#### Schedule Overrides
11. **Add One-Time Items**
    - User adds a one-time entry to a specific date
    - Verify one-time entry appears only on that date
    - Verify one-time entry is visually distinguished
12. **Make One-Time Override to Recurring Entry**
    - User modifies a recurring entry for a specific date
    - Verify original entry remains unchanged on other dates
    - Verify modified entry appears on the specified date
13. **Skip Single Instance of Recurring Entry**
    - User skips a recurring entry for a specific date
    - Verify entry does not appear on that date
    - Verify entry continues to appear on other dates

#### Schedule Sharing
14. **Share Schedule with Valid User**
    - Owner shares schedule with another user's email
    - Verify shared user appears in sharing list
    - Verify shared user can view and edit the schedule
15. **Share Schedule with Invalid User**
    - Owner attempts to share with non-existent email
    - Verify appropriate error message is displayed
    - Verify sharing list remains unchanged
16. **Remove User from Shared Schedule**
    - Owner removes a user from shared access
    - Verify user is removed from sharing list
    - Verify removed user can no longer access schedule

#### iCal Integration
17. **View iCal Feed**
    - Access public iCal feed URL for a schedule
    - Verify feed contains correct recurring events
    - Verify feed includes one-time entries and overrides

---

## 3. Unit Tests

### Tools
- Recommended: Vitest or Jest for TypeScript
- Use wrangler local KV for repository and business logic tests

### Areas to Cover
- User repository (CRUD)
- Schedule repository (CRUD, sharing, entry management)
- Business logic (overlap prevention, time zone handling, etc.)
- Value object validation (e.g., ScheduleEntry invariants)

---

## 4. Test Environment
- Use `wrangler dev` or local Worker mode for all tests
- Use a dedicated local KV namespace for tests to ensure isolation
- Clean up test data between runs

---

## 5. Principles
- Minimize mocking; prefer real or local implementations
- Tests should be deterministic and repeatable
- Prioritize coverage of critical paths and business rules

---

## 6. Manual QA
- Perform manual smoke testing for sign-in, schedule/task CRUD, iCal feed import
- Validate SPA navigation and static asset serving

---

This testing strategy is ready for implementation. Expand coverage as the app evolves.