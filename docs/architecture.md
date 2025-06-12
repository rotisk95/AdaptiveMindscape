# Architecture Overview

AdaptiveMindscape consists of a Node/Express backend and a React frontend. Both share TypeScript types defined under `shared/`.

## Backend

- Located in `server/`.
- `index.ts` sets up middleware and registers API and WebSocket routes.
- `routes.ts` defines REST endpoints under `/api` and broadcasts events over WebSockets.
- `neural-engine.ts` implements a small transformer-like model used for generation demos.
- `storage.ts` provides a `DatabaseStorage` class that wraps Drizzle ORM queries.

## Frontend

- Located in `client/` with Vite configuration.
- `src/pages/adaptive-ai.tsx` is the main page that connects to the server using React Query and a custom WebSocket hook.
- UI components are in `src/components/` and styled with Tailwind CSS.

## Database Schema

Drizzle ORM tables are defined in `shared/schema.ts`. They include `sessions`, `reflections`, `memory_insights`, and tables for storing neural network weights and vocabulary.

## Development Workflow

1. Run `npm run dev` to start the server with Vite in development mode.
2. Navigate to `http://localhost:5000` to access the frontend UI.
3. WebSocket messages stream reflections and generation updates in real time.

