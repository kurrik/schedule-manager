import { Hono, type Context, type Next } from 'hono';
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
