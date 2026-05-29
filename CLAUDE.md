# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Iron Fellowship & Crew Link is a React web app for playing the Ironsworn and Starforged tabletop RPGs. It provides character sheets, campaign management, world building, homebrew content creation, and an AI-guided play mode.

The repo supports two apps sharing the same codebase — **Iron Fellowship** (Ironsworn) and **Crew Link** (Starforged) — differentiated by environment variables (`VITE_GAME_SYSTEM`).

> **Note:** There is no Firebase or Firestore in this project. The data layer is a NestJS REST API backed by PostgreSQL. Any mention of Firebase in older code comments is stale and should be ignored.

---

## Repo Structure

This is a **pnpm monorepo**:

```
starforged/
├── src/                    ← React frontend (Vite + React Router)
├── api/                    ← NestJS backend (REST + Socket.IO)
│   ├── src/
│   └── drizzle/            ← SQL migrations
├── packages/
│   └── shared/             ← Shared TypeScript types (frontend + backend)
└── pnpm-workspace.yaml
```

---

## Commands

```bash
# Development (from repo root)
pnpm install                             # Install all dependencies
pnpm dev:all                             # Start API + frontend together (watch mode)
pnpm api:dev                             # NestJS API only, port 3001
pnpm dev                                 # Vite frontend only, port 5173

# Quality
pnpm lint                                # ESLint on frontend (zero warnings tolerance)
pnpm --filter api run lint               # ESLint on backend

# Build
pnpm build                               # TypeScript check + Vite build → dist/
pnpm api:build                           # Compile NestJS → api/dist/

# Database
pnpm --filter api run drizzle:generate   # Generate migration from schema changes
pnpm --filter api run drizzle:migrate    # Apply pending migrations
pnpm --filter api run drizzle:studio     # Open Drizzle Studio (browser DB inspector)
```

There are no unit tests in this project.

---

## Architecture

### Data Flow

```
REST API (NestJS) ──→ TanStack Query (server state) ──→ React components
                              ↑
                     Socket.IO room events
                     (server broadcasts "updated";
                      client calls invalidateQueries)

Zustand stores ─── local UI state + AI Guide state (not server state)
Yjs + TipTap ────── collaborative rich-text notes (synced via /yjs Socket.IO namespace)
```

**TanStack Query** is used for all server data. Query hooks live in `src/hooks/queries/`. Each entity type has a key factory (`campaignKeys`, `characterKeys`, etc.) used consistently across hooks and invalidation.

**Zustand** manages local UI state and the AI Guide state (which is also persisted server-side as a JSON blob in `campaign_ai_guide_state.state_json`). The Zustand `aiGuide` slice is the source of truth during a play session; changes are flushed to the server via `saveGuideState`.

**Socket.IO** provides real-time updates. The server broadcasts an `updated` event on the relevant room (e.g. `campaign`, `world`) after any write. `useSocketInvalidation` in `src/hooks/useSocketInvalidation.ts` subscribes to these events and calls `queryClient.invalidateQueries` for the affected keys.

**`useListenTo*` hooks** (in `src/stores/`) register Socket.IO room subscriptions and fire the initial data load. They are called once at the router level in `src/Router.tsx`.

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/hooks/queries/` | TanStack Query hooks for all server data |
| `src/stores/` | Zustand slices + `useListenTo*` subscription hooks |
| `src/pages/` | Page components; page-specific subcomponents live here too |
| `src/components/shared/` | Generic reusable components |
| `src/components/features/` | Feature-specific components shared across pages |
| `src/config/api.config.ts` | `api` fetch singleton (handles JWT refresh + 401 retry) |
| `src/data/` | Datasworn library re-exports (game rules) |
| `src/hooks/featureFlags/` | PostHog feature flag hooks |
| `src/types/` | TypeScript types for frontend features |
| `api/src/ai/` | AI service, prompt templates, schemas, providers |
| `api/src/campaigns/` | Campaign REST endpoints and service |
| `api/src/worlds/` | World/NPC/location REST endpoints |
| `api/src/db/schema.ts` | Drizzle table definitions (single source of truth for DB shape) |
| `api/drizzle/` | SQL migration files |

### Important Files

- `src/Router.tsx` — All route definitions; `useListenTo*` hooks are called here
- `src/stores/store.ts` — Root Zustand store combining all slices
- `src/config/api.config.ts` — Shared `api` fetch wrapper (JWT refresh, 401 retry)
- `api/src/db/schema.ts` — All Drizzle table definitions
- `api/src/ai/prompt-templates.ts` — All AI mode prompt builders
- `api/src/ai/schemas.ts` — Structured output JSON schemas for AI modes
- `api/src/ai/ai.service.ts` — AI orchestration, model selection, provider routing

### Route Lazy Loading

Pages are lazy-loaded in the router. Each page entry file must export the page component as a **named `Component` export**:

```ts
// src/pages/Campaign/CockpitPage/index.ts
export { CockpitPage as Component } from "./CockpitPage";
```

---

## Campaign Types

`CampaignType` enum in `src/types/Campaign.type.ts`:

| Type | Description |
|------|-------------|
| `Solo` | Single player, no GM |
| `Coop` | Multiple players, no GM |
| `Guided` | GM + players |
| `AIGuided` | AI-guided solo/coop — enables the Session Cockpit |

---

## AI Guide System (AIGuided Campaigns)

AIGuided campaigns unlock the **Session Cockpit** at `/campaigns/:id/play` — a full-screen play surface replacing the tab-based campaign view.

### State

All AI guide state lives in `src/stores/aiGuide/`. Key shape (from `src/types/AIGuideState.type.ts`):

```ts
interface AIGuideState {
  currentScene: { title, description, unresolvedQuestions }
  canonFacts: string[]          // legacy flat list (still read)
  canonLedger: CanonFact[]      // source of truth: { id, text, source, status, createdAt }
  npcIntents: Record<string, AIGuideNPCIntent>
  tensionClocks: TensionClock[]
  hiddenClocks: TensionClock[]
  pendingProposals: AIGuideProposal[]
  sceneChallengeState: AIGuideSceneChallengeState | null
  focusMode: "standard" | "combat" | "expedition" | "social"
  spotlight: { current?, recent, quiet }  // character tracking
}
```

Persisted to `campaign_ai_guide_state.state_json` on every `saveGuideState` call.

### AI Modes

Defined in `api/src/ai/prompt-templates.ts`. Two tiers:

- **HEAVY_MODES** (use `claude-sonnet` / `gpt-4o`): `sessionRecap`, `bookkeeper`, `bookkeepingProposal`, `priceProposal`, `outcomeNarration`, `sceneFrame`, `sectorGeneration`
- **Default** (use `claude-haiku` / `gpt-4o-mini`): everything else

All structured-output modes have their JSON schemas in `api/src/ai/schemas.ts`.

**Ephemeral modes** (`actionSuggestions`, `intentToMove`, `spotlightNudge`) are consumed inline by the cockpit — they are auto-removed from `pendingProposals` after the response arrives. All other modes produce persistent proposals the player must accept/reject.

The active AI provider is set by `AI_PROVIDER` in `api/.env` (`openai` or `anthropic`).

### Cockpit Layout

```
src/pages/Campaign/CockpitPage/
  CockpitPage.tsx          ← route entry, gate for AIGuided only
  layout/
    CockpitTopBar.tsx       ← location breadcrumb, scene state
    CockpitLeftRail.tsx     ← party cards, NPC status, SpotlightIndicator
    CockpitCenter.tsx       ← scene panel + proposal feed
    CockpitComposer.tsx     ← action input + AI chips
  composer/
    SuggestedActionChips.tsx
  guide/
    AskGuideDrawer.tsx      ← quick-prompt sidecar (slides over right rail)
  history/
    SessionHistoryDrawer.tsx   ← Timeline / Recap / Canon tabs
  shared/
    CockpitContext.tsx      ← openEntity() for drawer navigation
    EntityDrawer.tsx        ← discriminated entity detail drawer
    KnowledgeBadge.tsx      ← Known/Suspected/Hidden chip
    SpotlightIndicator.tsx  ← spotlight state + nudge AI
    useCockpitAiRequest.ts  ← builds AiCampaignContext + fires AI request
```

`useCockpitAiRequest` is the single hook for all cockpit AI calls. It builds the full `AiCampaignContext` (including `guideState`) from the Zustand store before every request.

---

## AI-Powered Sector Generation

`GenerateSectorDialog` in `src/components/features/worlds/SectorSection/` orchestrates full sector creation:
1. Rolls oracle tables (sector name, trouble, settlements, NPC)
2. Calls `POST /api/ai/sector/content` with oracle results + world truths
3. Creates all locations (sector, settlements, planets) and an NPC in Postgres
4. Writes AI-generated content to the right storage slots:
   - Settlement **public notes** → `updateLocationNotes` (player-facing)
   - Settlement **GM notes** → `updateLocationGMProperties({ gmNotes })` (GM-only)
   - Planet **public notes** → `updateLocationNotes` (AI description)
   - NPC **public notes** → `updateNPCNotes` (player-facing)
   - NPC **GM properties** → `firstLook`, `goal`, `revealedAspect` in `updateNPCGMProperties`
   - Sector **GM notes** → `updateLocationGMProperties({ gmNotes })` (trouble narrative)

---

## Database

All tables defined in `api/src/db/schema.ts` using Drizzle ORM. Key tables:

| Table | Purpose |
|-------|---------|
| `users`, `magic_link_tokens` | Auth |
| `campaigns`, `campaign_members`, `campaign_gms`, `campaign_characters` | Campaign membership |
| `campaign_ai_events`, `campaign_ai_guide_state` | AI Guide persistence |
| `campaign_scene_events` | Structured event log (cockpit history) |
| `campaign_starship` | Starship per campaign |
| `worlds`, `world_locations`, `world_npcs`, `world_lore`, `world_sectors` | World builder |
| `characters`, `character_assets`, `character_tracks` | Character sheets |

Rich-text notes (player and GM) are stored as Yjs update bytes in separate `*_notes` tables.

After any schema change: `pnpm --filter api run drizzle:generate` then `drizzle:migrate`. Add the new migration entry to `api/drizzle/meta/_journal.json` with the correct `idx` and `tag`.

---

## Rich Text (Yjs + TipTap)

Notes on characters, NPCs, locations, and lore are collaborative Yjs documents. The frontend uses TipTap with the Collaboration extension. The backend syncs documents via a dedicated `/yjs` Socket.IO namespace.

To write AI-generated text into a note programmatically:

```ts
import { TiptapTransformer } from "@hocuspocus/transformer";
import * as Y from "yjs";

function textToYjsBytes(text: string): Uint8Array {
  const paragraphs = text.split(/\n\n+/).filter(Boolean)
    .map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] }));
  const tiptapJson = { type: "doc", content: paragraphs };
  const ydoc = TiptapTransformer.toYdoc(tiptapJson, "default");
  return Y.encodeStateAsUpdate(ydoc);
}
```

---

## Authentication

- **Google OAuth** — `GET /api/auth/google` → callback sets JWT + refresh token as `httpOnly` cookies
- **Magic link** — `POST /api/auth/magic-link` → email with token; `GET /api/auth/magic-link/verify?token=...` exchanges it for cookies
- **JWT** — access token (short-lived) + refresh token (long-lived), both in cookies
- The `api` fetch wrapper in `src/config/api.config.ts` automatically retries 401s with a refresh attempt before signing the user out

---

## Environment Variables

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:3001        # defaults to localhost:3001 if omitted
VITE_GAME_SYSTEM=starforged               # or "ironsworn"
VITE_TITLE="Starforged Crew Link"
VITE_FAVICON_PATH=/theme/eidolon.svg
VITE_OPENGRAPH_PATH=/assets/starforged/opengraph-default.png
# VITE_POSTHOG_KEY=                       # optional analytics + feature flags
# VITE_POSTHOG_HOST=
```

### Backend (`api/.env`)

```env
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:password@localhost:5432/starforged
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=starforged
SMTP_HOST=localhost
SMTP_PORT=1025
# AI (optional — only needed for AI features)
# AI_PROVIDER=openai                      # "openai" (default) or "anthropic"
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# Model overrides (fall back to hardcoded defaults if omitted)
# ANTHROPIC_DEFAULT_MODEL=claude-haiku-4-5-20251001
# ANTHROPIC_HEAVY_MODEL=claude-sonnet-4-6
# OPENAI_DEFAULT_MODEL=gpt-4o-mini
# OPENAI_HEAVY_MODEL=gpt-4o
```

---

## Key Libraries

- **[Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)** — Local UI state + AI Guide state
- **[TanStack Query](https://tanstack.com/query/latest)** — Server state, caching, and invalidation
- **[Material UI v5](https://mui.com/material-ui/getting-started/)** — Component library and theming
- **[React Router v6](https://reactrouter.com/)** — Client-side routing with lazy-loaded pages
- **[Socket.IO client](https://socket.io/docs/v4/client-api/)** — Real-time room subscriptions + Yjs sync
- **[Drizzle ORM](https://orm.drizzle.team/)** — Type-safe PostgreSQL on the backend
- **[NestJS](https://nestjs.com/)** — Backend framework (REST + WebSockets)
- **[Datasworn](https://github.com/rsek/datasworn)** — Digitized Ironsworn/Starforged game rules
- **Tiptap + Yjs** — Collaborative rich text editing for notes
- **PostHog** — Analytics + remote feature flags (optional)

---

## Feature Flags

PostHog feature flags gate in-progress features. See `src/hooks/featureFlags/` for the pattern. The `useAiGuide` flag gates the legacy AI copilot tab; the `useAiCopilot` flag is used by the new cockpit.

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
