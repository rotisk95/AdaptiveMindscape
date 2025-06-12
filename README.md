# AdaptiveMindscape

AdaptiveMindscape is a full-stack TypeScript application that demonstrates a real-time AI reflection engine.
It combines a Node/Express backend, a Postgres database via Drizzle ORM, and a React frontend served with Vite.

## Repository Structure

- **client/** – React frontend built with Vite and Tailwind CSS
- **server/** – Express API, WebSocket server, and simplified neural engine
- **shared/** – Database schema and shared TypeScript types
- **attached_assets/** – Miscellaneous assets from development

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   - `DATABASE_URL` – connection string for Postgres (Neon is used by default)
   - `OPENAI_API_KEY` – key for OpenAI API calls
3. Start the development server:
   ```bash
   npm run dev
   ```
   This will run the Express API and the Vite dev server on port `5000`.

## Scripts

- `npm run dev` – start the server in development with hot reload
- `npm run build` – build the client and server for production
- `npm run start` – run the production build
- `npm run check` – type check the project with TypeScript

## Features

- WebSocket updates for live reflection and generation events
- Custom neural engine with tokenization and training placeholders
- Drizzle ORM models defined in `shared/schema.ts`
- React UI with reusable components from Radix and Tailwind

For more details see the documentation in the `docs/` directory.
