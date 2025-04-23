# Server Architecture & Implementation Plan

## Overview
This document details the technical architecture and implementation steps for the Schedule Manager Cloudflare Worker app, covering:
- Project structure
- Hono framework setup
- hono-simple-google-auth integration
- Cloudflare KV usage
- Static asset serving
- Routing and authentication
- TypeScript and CI configuration
- Step-by-step implementation plan

---

## 1. Project Structure
- **Single repository/folder** containing both backend (Worker) and frontend (SPA assets).
- **Wrangler** for local development and deployment.
- **TypeScript** with strict typing enabled.
- **Environment secrets** managed via `wrangler secret`.

**Example Directory Layout:**
```
/
  src/           # Worker code (TypeScript)
  public/        # Frontend static assets (built SPA)
  package.json
  tsconfig.json
  wrangler.toml
```

---

## 2. Hono Framework Setup
- Install dependencies:
  - `hono`
  - `hono-simple-google-auth`
  - `@cloudflare/kv-asset-handler` (if needed for static assets)
  - `@cloudflare/workers-types` (for TypeScript)
- Initialize Hono app in `src/index.ts`:
  ```ts
  import { Hono } from 'hono';
  import { googleAuth } from 'hono-simple-google-auth';
  // ...other imports

  const app = new Hono<{ Bindings: Env }>();
  ```
- Minimal middleware: only hono-simple-google-auth, static serving, and error handling as needed.

---

## 3. Authentication & Session Management
- Use **hono-simple-google-auth** for Google sign-in only.
- Store session tokens in **signed cookies**.
- Store session data in **Cloudflare KV** (single namespace for all data).
- Configure secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`) via `wrangler secret`.
- All `/api` endpoints require authentication middleware, except for public `/ical` endpoints.

---

## 4. Data Storage (Cloudflare KV)
- Use a **single KV namespace** for all data (users, schedules, tasks, sessions).
- Key structure example:
  - `user:<id>`
  - `schedule:<id>`
  - `task:<id>`
  - `session:<token>`
- Store all structured data as JSON.

---

## 5. Static Asset Serving
- Bundle frontend static assets (HTML, JS, CSS, etc.) with the Worker at build time.
- Serve static files from `/public`.
- All unmatched routes (not `/api` or `/ical`) serve `index.html` for SPA routing.

---

## 6. Routing
- **/api/** – All authenticated API endpoints (CRUD for schedules, tasks, etc.)
- **/ical/** – Public iCal feed endpoints
- **Static** – All other requests serve static assets or `index.html`

---

## 7. TypeScript & CI
- `tsconfig.json` with `strict: true` and all strictness flags enabled.
- CI/linting (e.g., ESLint, type-check) blocks merges on type errors.

---

## 8. Implementation Steps

1. **Initialize project**
   - `wrangler init` (choose TypeScript template)
   - Set up `src/`, `public/`, `package.json`, `tsconfig.json`, `wrangler.toml`
2. **Install dependencies**
   - `npm install hono hono-simple-google-auth @cloudflare/kv-asset-handler @cloudflare/workers-types`
3. **Configure TypeScript**
   - Enable strict mode in `tsconfig.json`
4. **Set up environment secrets**
   - `wrangler secret put GOOGLE_CLIENT_ID`
   - `wrangler secret put GOOGLE_CLIENT_SECRET`
   - `wrangler secret put SESSION_SECRET`
5. **Set up Cloudflare KV**
   - Add KV binding to `wrangler.toml`
6. **Implement authentication**
   - Integrate `hono-simple-google-auth` in `src/index.ts`
   - Use signed cookies and store session data in KV
7. **Implement routing**
   - `/api/*` endpoints with authentication middleware
   - `/ical/*` endpoints (public)
   - Static asset serving and SPA fallback
8. **Implement data storage logic**
   - CRUD handlers for users, schedules, tasks in KV
   - Key structure and JSON serialization
9. **Frontend integration**
   - Build SPA assets into `public/`
   - Ensure correct static asset serving from Worker
10. **Testing**
    - Write unit and integration tests (authentication, routing, storage)
    - Manual QA for sign-in, schedule/task CRUD, iCal feeds, and SPA navigation
11. **Deployment**
    - Use `wrangler publish` to deploy to Cloudflare Workers

---

## 9. Developer Notes
- Keep middleware minimal; add CORS, logging, rate limiting only if needed.
- All secrets and sensitive data handled via Wrangler secrets.
- SPA routing: all unknown paths serve `index.html`.
- Only Google sign-in is supported for authentication.
- All data (sessions, users, schedules, tasks) in a single KV namespace.
- All code in a single repo/folder for simplicity.

---

This architecture and plan are ready for immediate implementation. For questions, refer to the Q&A or contact the product owner.
