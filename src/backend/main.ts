import { Hono } from 'hono';
import { honoSimpleGoogleAuth, createKVSessionStore, type GoogleAuthEnv } from 'hono-simple-google-auth';
import type { KVNamespace, Fetcher } from '@cloudflare/workers-types';
import { scheduleHandlers } from './api/schedule-handlers';

export type Env = GoogleAuthEnv & {
  Bindings: {
    KV: KVNamespace;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ASSETS: Fetcher;
  };
};

type Session = {
  id: string;
  signedIn: boolean;
  name: string;
  email: string;
};

type AppContext = {
  Bindings: Env['Bindings'];
  Variables: {
    session: Session;
  };
};

const app = new Hono<AppContext>();

// Add session to context
app.use('*', async (c, next) => {
  const session = c.get('session') || { signedIn: false, id: '', name: '', email: '' };
  c.set('session', session);
  await next();
});

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
app.get('/api/me', async (c) => {
  const session = c.var.session;
  if (!session?.signedIn) return c.json({ error: 'Not authenticated' }, 401);
  return c.json({ name: session.name, email: session.email });
});

// Schedule routes
app.get('/api/schedules', scheduleHandlers.getSchedules);
app.post('/api/schedules', scheduleHandlers.createSchedule);

// --- Public iCal Feed Route ---
app.get('/ical/:icalUrl', async (c) => {
  // Serve iCal feed for the given schedule
  // TODO: Implement actual iCal feed logic
  return c.text('BEGIN:VCALENDAR\n...');
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
