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
1. **User Sign In**
   - Simulate Google sign-in flow
   - Verify authenticated session is established
2. **Create Schedule**
   - User creates a new schedule (name, time zone)
   - Verify schedule appears in user’s list
3. **Add Schedule Entries**
   - User adds one or more entries to a schedule
   - Verify entries are displayed in the weekly view
4. **View iCal Feed**
   - Access public iCal feed URL for a schedule
   - Verify feed contains correct recurring events

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
