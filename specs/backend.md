# Server Architecture & Implementation Plan

## Overview
This document details the technical architecture and implementation for the Schedule Manager Cloudflare Worker app, covering:
- Project structure
- Hono framework setup
- hono-simple-google-auth integration
- Cloudflare D1 database and KV storage
- Domain-Driven Design architecture
- Static asset serving via Cloudflare Assets
- Routing and authentication
- TypeScript and CI configuration
- Testing and deployment

---

## 1. Project Structure
- **Monorepo** containing both backend (Cloudflare Worker) and frontend (SolidJS SPA).
- **Wrangler** for local development and deployment.
- **TypeScript** with strict typing enabled.
- **Domain-Driven Design** architecture with clear separation of concerns.
- **Vite** for building both frontend and backend assets.

**Current Directory Layout:**
```
/
  src/
    backend/
      api/                     # API route handlers
      domain/
        models/                # Domain entities (User, Schedule, etc.)
        repositories/          # Repository interfaces
        services/              # Domain services (iCal, etc.)
      infrastructure/
        repositories/          # D1 repository implementations
        unit-of-work/          # Unit of Work pattern
      main.ts                  # Worker entry point
    frontend/
      components/              # SolidJS components
      services/                # Frontend API clients
      App.tsx                  # Main app component
      index.tsx               # Frontend entry point
  public/                      # Static assets (served by Cloudflare Assets)
  specs/                       # Documentation and specifications
  schema.sql                   # D1 database schema
  package.json
  tsconfig.json
  wrangler.jsonc              # Cloudflare Worker configuration
  vite.config.ts              # Vite build configuration
```

---

## 2. Hono Framework Setup
- **Core dependencies:**
  - `hono` - Web framework for Cloudflare Workers
  - `hono-simple-google-auth` - Google OAuth authentication
  - `@cloudflare/workers-types` - TypeScript definitions
  - `ical-generator` - iCal feed generation
  - `date-fns` - Date utilities for timezone handling

- **Worker entry point** in `src/backend/main.ts`:
  ```ts
  import { Hono } from 'hono';
  import { honoSimpleGoogleAuth } from 'hono-simple-google-auth';
  
  export type Env = GoogleAuthEnv & {
    Bindings: {
      KV: KVNamespace;    // Sessions only
      DB: D1Database;     // Main data storage
      ASSETS: Fetcher;    // Static asset serving
      // ... other environment variables
    };
  };
  
  const app = new Hono<AppContext>();
  ```
- **Middleware stack:** Google Auth, user upsertion, static asset serving

---

## 3. Authentication & Session Management
- **Google OAuth** via `hono-simple-google-auth` for authentication only.
- **Session storage:** Cloudflare KV for session tokens and data.
- **User upsertion:** Automatic user creation/update on successful sign-in.
- **Environment variables:** 
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (OAuth credentials)
  - Session secrets managed by hono-simple-google-auth
- **Middleware flow:**
  1. Google Auth middleware verifies session
  2. User upsertion middleware creates/updates user in D1
  3. User entity attached to request context for all `/api` routes
- **Public endpoints:** `/ical/*` routes are public (no authentication required)

---

## 4. Data Storage Architecture

### Cloudflare D1 (Primary Data Storage)
- **SQL Database** for all structured data (users, schedules, entries, overrides).
- **Schema-defined relationships** with foreign keys and constraints.
- **Indexed queries** for efficient lookups and joins.
- **Batch operations** for atomic updates (schedule + entries + shares).

**Core Tables:**
- `users` - User profiles from Google OAuth
- `schedules` - Schedule metadata (owner, name, timezone, ical_url)
- `schedule_shares` - Many-to-many sharing relationships
- `schedule_entries` - Recurring schedule entries (tasks)
- `schedule_overrides` - Future: one-time modifications/exceptions

### Cloudflare KV (Session Storage Only)
- **Session tokens and data** for authentication.
- **Managed by hono-simple-google-auth** (no direct application access).

### Repository Pattern
- **Domain repositories** define data access interfaces.
- **D1 repositories** implement domain interfaces using SQL.
- **Unit of Work** pattern coordinates multiple repository operations.

---

## 5. Static Asset Serving
- **Cloudflare Assets** serves the SolidJS frontend application.
- **Vite builds** frontend assets into `public/` directory.
- **Single-page application mode** configured in `wrangler.jsonc`.
- **Fallback routing:** All unmatched routes (not `/api`, `/auth`, or `/ical`) serve `index.html` for client-side routing.
- **Asset optimization:** Automatic minification, compression, and CDN delivery.

---

## 6. Routing

### Authentication Routes
- `GET/POST /auth/*` - Google OAuth sign-in/callback/sign-out

### API Routes (Authenticated)
- `GET /api/me` - Current user info
- `GET /api/schedules` - List user's schedules
- `POST /api/schedules` - Create new schedule
- `GET /api/schedules/:id` - Get schedule details
- `PUT /api/schedules/:id` - Update schedule metadata
- `DELETE /api/schedules/:id` - Delete schedule (owner only)
- `POST /api/schedules/:id/entries` - Add schedule entry
- `PUT /api/schedules/:id/entries/:index` - Update schedule entry
- `DELETE /api/schedules/:id/entries/:index` - Delete schedule entry
- `GET /api/schedules/:scheduleId/overrides` - Get schedule overrides
- `POST /api/schedules/:scheduleId/overrides` - Create override
- `PUT /api/overrides/:overrideId` - Update override
- `DELETE /api/overrides/:overrideId` - Delete override

### Public Routes
- `GET /ical/:icalUrl` - Public iCal feed (no authentication)

### Static Assets
- `GET /*` - All other routes serve frontend SPA via Cloudflare Assets

---

## 7. TypeScript & Build System
- **Strict TypeScript** configuration with full type safety.
- **Multiple tsconfig files** for different build targets:
  - `tsconfig.json` - Base configuration
  - `tsconfig.app.json` - Frontend application
  - `tsconfig.node.json` - Build tooling
  - `tsconfig.worker.json` - Worker backend
- **Vite** for unified frontend and backend building.
- **NPM scripts:**
  - `npm run dev` - Local development server
  - `npm run build` - Production build
  - `npm run typecheck` - TypeScript validation
  - `npm run lint` - ESLint validation
  - `npm run deploy` - Build and deploy to Cloudflare

---

## 8. Domain-Driven Design Architecture

### Domain Layer
- **Entities:** `User`, `Schedule`, `ScheduleEntry`, `ScheduleOverride`
- **Value Objects:** Embedded within entities for type safety
- **Repository Interfaces:** Define data access contracts
- **Domain Services:** `ICalService` for feed generation, `CalendarMaterializationService` for event processing

### Infrastructure Layer
- **D1 Repositories:** Implement domain repositories using SQL
- **Unit of Work:** Coordinates multi-repository operations
- **External Services:** Google OAuth, timezone handling

### Application Layer
- **API Handlers:** Route handling and request/response transformation
- **Middleware:** Authentication, user upsertion, error handling

### Benefits
- **Clear separation of concerns** between business logic and infrastructure
- **Testable domain logic** independent of database implementation  
- **Type-safe data access** with repository pattern
- **Scalable architecture** that can grow with requirements

---

## 9. Development & Deployment

### Local Development
```bash
npm run dev          # Start local development server
npm run typecheck    # Validate TypeScript
npm run lint         # Check code style
```

### Database Setup
```bash
# Create D1 database
npx wrangler d1 create schedule-manager

# Apply schema (local and remote)
npx wrangler d1 execute schedule-manager --local --file=./schema.sql
npx wrangler d1 execute schedule-manager --remote --file=./schema.sql
```

### Production Deployment
```bash
npm run deploy       # Build and deploy to Cloudflare Workers
```

### Environment Configuration
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `wrangler.jsonc`
- Configure D1 and KV bindings in `wrangler.jsonc`
- Optional: Set `ROOT_DOMAIN` for production iCal URLs

---

## 10. Key Implementation Details

### Performance Optimizations
- **Indexed D1 queries** for fast schedule and user lookups
- **Batch operations** for atomic schedule updates (schedule + entries + shares)
- **iCal feed caching** with 5-minute cache headers
- **Minimal middleware stack** for fast request processing

### Security Considerations
- **Unguessable iCal URLs** using crypto.randomUUID()
- **Access control** enforced at domain level (schedule.isAccessibleBy())
- **Session management** handled securely by hono-simple-google-auth
- **SQL injection prevention** through prepared statements

### Scalability Features
- **Domain-driven architecture** enables easy feature additions
- **Repository pattern** allows swapping data storage implementations
- **Cloudflare global edge** for worldwide performance
- **Override system** ready for future schedule exceptions/modifications

### Monitoring & Debugging
- **Cloudflare observability** enabled in wrangler.jsonc
- **Console logging** for development debugging
- **Structured error handling** with proper HTTP status codes

---

This architecture documentation reflects the current implementation. For setup instructions, see `D1_SETUP.md`. For questions about domain logic, refer to the domain model specifications.
