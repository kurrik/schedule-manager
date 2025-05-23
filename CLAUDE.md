# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands
- Build: `npm run build`
- Dev server: `npm run dev`
- Type checking: `npm run typecheck`
- Linting: `npm run lint`
- Preview build: `npm run preview`
- Deploy: `npm run deploy`

## Code Style Guidelines
- **TypeScript**: Use strict typing with TypeScript (--strict mode)
- **Formatting**: Follow ESLint recommended rules for TypeScript
- **Imports**: Use ES modules format (import/export)
- **Frontend**: SolidJS with TailwindCSS/DaisyUI
- **Backend**: Hono framework for API routes
- **Architecture**: Domain-driven design with repositories and services
- **Error Handling**: Always use typed error handling with proper status codes
- **Naming Conventions**: 
  - Use kebab-case for files
  - Use PascalCase for components/classes
  - Use camelCase for variables/functions
- **File Organization**: Follow the established frontend/backend structure