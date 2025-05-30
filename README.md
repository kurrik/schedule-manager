# schedule-manager

A schedule management application built with SolidJS frontend and Hono backend, deployed on Cloudflare Workers.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables by creating a `.dev.vars` file in the root directory:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ROOT_DOMAIN=http://localhost:3000
   ```

Create bindings (only needed one time)
```bash
npx wrangler@latest d1 create test-schedule-manager
npx wrangler@latest d1 create dev-schedule-manager
npx wrangler@latest d1 create prod-schedule-manager

npx wrangler@latest kv namespace create KV
npx wrangler@latest kv namespace create --env=test KV
npx wrangler@latest kv namespace create --env=dev KV
```

## Development

Start the development server:
```bash
npm run dev
```

# Prod deploy

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET

npm run deploy
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to Cloudflare Workers

## Tech Stack

- **Frontend**: SolidJS with TailwindCSS/DaisyUI
- **Backend**: Hono framework
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1