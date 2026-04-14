# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Iron Fellowship & Crew Link is a React web app for playing the Ironsworn and Starforged tabletop RPGs. It provides character sheets, campaign management, GM screens, and homebrew content creation with real-time collaborative sync via Supabase.

The repo supports two deployed apps sharing the same codebase — **Iron Fellowship** (Ironsworn) and **Crew Link** (Starforged) — differentiated by a single `VITE_TITLE` / branding environment variable. Both apps use the same self-hosted Supabase instance.

## Commands

```bash
# Development
npm i                              # Install all dependencies
npm run dev                        # Start local dev server (Vite)

# Quality
npm run lint                       # ESLint (zero warnings tolerance)

# Build
npm run build                      # TypeScript + Vite build

# Supabase (local Docker)
cd deploy && ./scripts/setup.sh   # First-time Docker setup
docker compose -f deploy/docker-compose.yml logs -f   # View logs
```

There are no unit tests in this project.

To switch between Iron Fellowship and Crew Link while running locally, click the settings icon in the bottom left and select "Switch System".

## Architecture

### Data Flow

Data flows in one direction: **Supabase → api-calls → Zustand stores → React components**

1. **`src/api-calls/`** — All Supabase read/write operations, organized by feature (character, campaign, world, etc.). Realtime updates use Supabase Realtime channels (`postgres_changes` events), replacing the old Firestore `onSnapshot` pattern.
2. **`src/stores/`** — Zustand state slices that consume api-calls. Each feature area has a slice with a corresponding `useListenTo*` hook (e.g., `useListenToNPCs`) that must be called to populate the store with live data.
3. **`src/pages/` + `src/components/`** — UI layer that reads from stores and dispatches store actions.

### Realtime Subscription Pattern

```typescript
// Subscribe FIRST to avoid missing changes
const channel = supabase
  .channel(`table:${id}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "my_table", filter: `id=eq.${id}` },
    (payload) => { if (payload.eventType !== "DELETE") callback(payload.new); })
  .subscribe();

// Then fetch initial data
supabase.from("my_table").select("*").eq("id", id).single()
  .then(({ data }) => { if (data) callback(data); });

return () => supabase.removeChannel(channel);
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/api-calls/` | Supabase read/write operations |
| `src/stores/` | Zustand state + listener hooks |
| `src/pages/` | Page components; page-specific subcomponents live here too |
| `src/components/shared/` | Generic reusable components |
| `src/components/features/` | Feature-specific components shared across pages |
| `src/data/` | Datasworn library re-exports (game rules for Ironsworn/Starforged) |
| `src/hooks/featureFlags/` | PostHog feature flag integration |
| `src/functions/` | Non-React helper functions |
| `src/types/` | TypeScript types for features and database objects |
| `supabase/functions/` | Supabase Edge Functions (Deno; replace Firebase Cloud Functions) |
| `supabase/migrations/` | PostgreSQL schema migrations |
| `deploy/` | Docker Compose deployment package for self-hosted Supabase |
| `scripts/` | Data migration scripts (Firebase → Supabase) |

### Important Files

- `src/Router.tsx` — All route definitions; listener hooks are called here to subscribe to data
- `src/stores/store.ts` — Root Zustand store configuration
- `src/config/supabase.config.ts` — Single Supabase client instance
- `src/lib/database.types.ts` — TypeScript types matching the PostgreSQL schema
- `supabase/migrations/001_initial_schema.sql` — Full database schema
- `supabase/migrations/002_rls_policies.sql` — Row-Level Security policies
- `supabase/migrations/003_realtime.sql` — Realtime publication config
- `supabase/migrations/004_storage.sql` — Storage bucket config
- `deploy/docker-compose.yml` — Self-hosted Supabase stack

### Feature Flags

New features can be gated behind PostHog feature flags until fully tested. See `src/hooks/featureFlags/` for examples.

## Environment Variables

Create `.env.local` at the repo root (see `.env.local.example`):

```
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=

VITE_TITLE="Iron Fellowship"
VITE_FAVICON_PATH=/theme/eidolon.svg
VITE_OPENGRAPH_PATH=/assets/ironsworn/opengraph-default.png

# Optional: PostHog analytics + feature flags
# VITE_POSTHOG_KEY=
# VITE_POSTHOG_HOST=
```

For Crew Link, change `VITE_TITLE` and the opengraph path to the Starforged variants.

## Key Libraries

- **[Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)** — Global state management between Supabase and components
- **[@supabase/supabase-js](https://supabase.com/docs/reference/javascript)** — Auth, PostgreSQL database (via PostgREST), Realtime, Storage, and Edge Functions
- **[Material UI](https://mui.com/material-ui/getting-started/)** — Component library and styling
- **[Datasworn](https://github.com/rsek/datasworn)** — Digitized Ironsworn game rules used throughout the app
- **Tiptap + Yjs** — Collaborative rich text editing in notes

## Permissions

You have permission to freely read, create, edit, and delete any file in this
repository without asking for approval.

You may run the following commands without asking:
- npm run test, npm run build, npm run lint
- git status, git diff, git log
- docker compose ps, docker compose logs

Ask before running:
- Any command that modifies data outside this repository
- Any destructive git operation (reset --hard, force push)
- Any docker compose up/down/restart
