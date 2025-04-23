# Frontend Specification – Schedule Manager

## Overview
This document specifies the frontend architecture and implementation plan for the Schedule Manager SPA. The frontend is built with Solid, styled using DaisyUI (on top of Tailwind CSS), and interacts with the backend via authenticated API endpoints. Authentication is handled by redirecting unauthenticated users to the hono-simple-google-auth sign-in page.

---

## 1. Frameworks & Tooling
- **SPA Framework:** Solid
- **Styling/UI:** DaisyUI (with Tailwind CSS)
- **Routing:** Solid Router (client-side routing)
- **Build Tool:** Vite (recommended for Solid)

---

## 2. Authentication Flow
- On app load, the SPA checks for an authenticated user via an API call (e.g., `/api/me`).
- If not authenticated, the SPA redirects to the hono-simple-google-auth sign-in page (backend endpoint).
- On successful sign-in, user state is stored in frontend app state (no sensitive data in localStorage).
- Logout redirects to a backend endpoint to clear the session.

---

## 3. Main Views & Routing
- **Schedule List (`/`)**
  - Shows all schedules owned or shared with the user.
  - Displays: schedule name, owner, time zone, number of entries, last modified date, and shared users.
  - Option to create a new schedule.
- **Schedule Detail (`/schedule/:id`)**
  - Weekly grid view (blocks) starting on Sunday.
  - Shows all ScheduleEntries for the selected schedule.
  - Option to change schedule name and time zone.
  - Displays public iCal feed URL and data.
  - **Modals:**
    - Create new entry (modal form)
    - Edit/delete entry (modal on click)
- **Fallback:** All unknown routes redirect to `/`.

---

## 4. UI/UX Details
- Responsive design for desktop and mobile.
- Use DaisyUI components for consistency and accessibility.
- Modals for all entry creation/edit/delete actions.
- Grid layout for weekly schedule (like a calendar week view).
- SPA navigation—no full page reloads between views.

---

## 5. API Integration
- All data fetched via `/api` endpoints (authenticated).
- Schedule and entry CRUD, user info, and schedule sharing handled via API.
- iCal feed displayed in detail view via public endpoint.

---

## 6. State Management
- Prefer Solid’s built-in reactivity for state.
- Minimal global state; use context for user/session and schedule selection.

---

## 7. Testing
- Unit tests for key components and UI logic (e.g., form validation, modal logic).
- E2E tests for core workflows: sign in, schedule CRUD, entry CRUD, iCal feed display.

---

## 8. Accessibility
- All interactive elements are keyboard-accessible.
- Modals are focus-trapped and ARIA-labeled.
- Sufficient color contrast and semantic markup.

---

## 9. Implementation Steps
1. Scaffold Solid project with Vite, DaisyUI, and Tailwind CSS.
2. Implement authentication check and redirect logic.
3. Implement routing for schedule list and detail views.
4. Build schedule list view, fetching and displaying user’s schedules.
5. Build schedule detail view with weekly grid and modals for entry management.
6. Integrate API calls for all CRUD operations.
7. Add iCal feed display in detail view.
8. Add responsive and accessible UI polish.
9. Write unit and E2E tests for core flows.

---

This frontend specification is ready for implementation. Expand views and features as requirements evolve.
