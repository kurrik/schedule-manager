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

## Development

Start the development server:
```bash
npm run dev
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