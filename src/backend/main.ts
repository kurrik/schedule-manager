import { Hono, type Context, type Next } from 'hono';
import { honoSimpleGoogleAuth, createKVSessionStore, type GoogleAuthEnv } from 'hono-simple-google-auth';
import type { KVNamespace, Fetcher } from '@cloudflare/workers-types';
import { scheduleHandlers } from './api/schedule-handlers';
import { KVUnitOfWork } from './infrastructure/unit-of-work/kv-unit-of-work';
import { ICalService } from './domain/services/ical-service';

export type Env = GoogleAuthEnv & {
  Bindings: {
    KV: KVNamespace;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ASSETS: Fetcher;
    ROOT_DOMAIN?: string; // Optional override for production domain
  };
};

type Session = {
  id: string;
  signedIn: boolean;
  name: string;
  email: string;
  profileImageUrl?: string;
};

type AppContext = {
  Bindings: Env['Bindings'];
  Variables: {
    session: Session;
    user?: import('./domain/models/user').User;
  };
};

const app = new Hono<AppContext>();

// Add session to context
app.use('*', async (c, next) => {
  const session = c.get('session') || { signedIn: false, id: '', name: '', email: '', profileImageUrl: '' };
  c.set('session', session);
  await next();
});

// Middleware to upsert user and attach to context
import { KVUserRepository } from './infrastructure/repositories/kv-user-repository';
const upsertUserMiddleware = async (c: Context<AppContext>, next: Next) => {
  const session = c.get('session');
  if (session?.signedIn && session.email) {
    const userRepo = new KVUserRepository(c.env.KV);
    const user = await userRepo.upsertByEmail({
      email: session.email,
      displayName: session.name,
      profileImageUrl: session.profileImageUrl ?? '',
    });
    console.log('[DEBUG] Upserted user:', user.toJSON());
    c.set('user', user);
  }
  await next();
};

// --- Auth Routes ---

const googleAuth = honoSimpleGoogleAuth<Env>(async (c) => {
  const url = new URL(c.req.url);
  const callbackUrl = `${url.protocol}//${url.host}/auth/callback`;
  return {
    clientId: c.env.GOOGLE_CLIENT_ID,
    callbackUrl,
    sessionStore: createKVSessionStore(c.env.KV),
  };
});

app.route('/auth', googleAuth.routes);

// --- API Routes (Authenticated) ---
app.use('/api/*', googleAuth.session);
app.use('/api/*', upsertUserMiddleware);
app.get('/api/me', async (c) => {
  const session = c.var.session;
  if (!session?.signedIn) return c.json({ error: 'Not authenticated' }, 401);
  return c.json({ name: session.name, email: session.email });
});

// Schedule routes
app.get('/api/schedules', scheduleHandlers.getSchedules);
app.post('/api/schedules', scheduleHandlers.createSchedule);
app.get('/api/schedules/:id', scheduleHandlers.getSchedule);
app.put('/api/schedules/:id', scheduleHandlers.updateSchedule);
app.post('/api/schedules/:id/entries', scheduleHandlers.addScheduleEntry);
app.put('/api/schedules/:id/entries/:index', scheduleHandlers.updateScheduleEntry);
app.delete('/api/schedules/:id/entries/:index', scheduleHandlers.deleteScheduleEntry);

// --- Public iCal Feed Route ---
app.get('/ical/:icalUrl', async (c) => {
  const { icalUrl } = c.req.param();
  
  if (!icalUrl) {
    return c.notFound();
  }

  try {
    const uow = new KVUnitOfWork(c.env.KV);
    const schedule = await uow.schedules.findByICalUrl(icalUrl);
    
    if (!schedule) {
      return c.notFound();
    }

    // Generate the iCal feed
    const icalService = new ICalService();
    const url = new URL(c.req.url);
    const baseUrl = c.env.ROOT_DOMAIN || `${url.protocol}//${url.host}`;
    const icalContent = icalService.generateFeed(schedule, baseUrl);

    // Return with proper Content-Type and headers
    return c.text(icalContent, 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${schedule.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`,
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    });
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    return c.text('Internal Server Error', 500);
  }
});

// Catch-all route for frontend assets and client-side routing
app.get('*', async (c) => {
  try {
    // For GET requests, forward to the ASSETS service using the URL string
    const response = await c.env.ASSETS.fetch(c.req.url);

    // Convert the response to a format compatible with Hono
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.error('Error forwarding request to ASSETS:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

export default app;
