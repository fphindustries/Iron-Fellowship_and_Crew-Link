# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Iron Fellowship & Crew Link is a React web app for playing the Ironsworn and Starforged tabletop RPGs. It provides character sheets, campaign management, GM screens, and homebrew content creation with real-time collaborative sync via Firebase.

The repo supports two deployed apps sharing the same codebase — **Iron Fellowship** (Ironsworn) and **Crew Link** (Starforged) — differentiated by environment variables pointing to separate Firebase projects.

## Commands

```bash
# Development
npm i                              # Install all dependencies (root + functions)
npm run dev                        # Start local dev server (Vite)

# Quality
npm run lint                       # ESLint (zero warnings tolerance)
npm --prefix functions run lint    # Lint Firebase functions

# Build
npm run build                      # TypeScript + Vite build
npm --prefix functions run build   # Compile functions to functions/lib/
```

There are no unit tests in this project.

To switch between Iron Fellowship and Crew Link while running locally, click the settings icon in the bottom left and select "Switch System".

## Architecture

### Data Flow

Data flows in one direction: **Firestore → api-calls → Zustand stores → React components**

1. **`src/api-calls/`** — All Firestore read/write operations, organized by feature (character, campaign, world, etc.). Firestore connections are usually long-lived websocket subscriptions, not one-time fetches.
2. **`src/stores/`** — Zustand state slices that consume api-calls. Each feature area has a slice with a corresponding `useListenTo*` hook (e.g., `useListenToNPCs`) that must be called to populate the store with live data.
3. **`src/pages/` + `src/components/`** — UI layer that reads from stores and dispatches store actions.

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/api-calls/` | Firestore read/write operations |
| `src/stores/` | Zustand state + listener hooks |
| `src/pages/` | Page components; page-specific subcomponents live here too |
| `src/components/shared/` | Generic reusable components |
| `src/components/features/` | Feature-specific components shared across pages |
| `src/data/` | Datasworn library re-exports (game rules for Ironsworn/Starforged) |
| `src/hooks/featureFlags/` | PostHog feature flag integration |
| `src/functions/` | Non-React helper functions |
| `src/types/` | TypeScript types for features and database objects |
| `functions/src/` | Firebase Cloud Functions (homebrew editor invite management) |

### Important Files

- `src/Router.tsx` — All route definitions; listener hooks are called here to subscribe to data
- `src/stores/store.ts` — Root Zustand store configuration
- `firestore.rules` / `storage.rules` — Firebase security rules
- `firebase.json` — Firebase configuration including predeploy hooks

### Feature Flags

New features can be gated behind PostHog feature flags until fully tested. See `src/hooks/featureFlags/` for examples.

## Environment Variables

Create `.env.local` at the repo root:

```
VITE_IRON_FELLOWSHIP_FIREBASE_APIKEY=
VITE_IRON_FELLOWSHIP_FIREBASE_AUTHDOMAIN=
VITE_IRON_FELLOWSHIP_FIREBASE_PROJECTID=
VITE_IRON_FELLOWSHIP_FIREBASE_STORAGEBUCKET=
VITE_IRON_FELLOWSHIP_FIREBASE_MESSAGINGSENDERID=
VITE_IRON_FELLOWSHIP_FIREBASE_APPID=

VITE_CREW_LINK_FIREBASE_APIKEY=
VITE_CREW_LINK_FIREBASE_AUTHDOMAIN=
VITE_CREW_LINK_FIREBASE_PROJECTID=
VITE_CREW_LINK_FIREBASE_STORAGEBUCKET=
VITE_CREW_LINK_FIREBASE_MESSAGINGSENDERID=
VITE_CREW_LINK_FIREBASE_APPID=

VITE_TITLE="Starforged Crew Link"
VITE_FAVICON_PATH=/theme/eidolon.svg
VITE_OPENGRAPH_PATH=/assets/starforged/opengraph-default.png

# Optional: PostHog analytics + feature flags
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
```

## Key Libraries

- **[Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)** — Global state management between Firebase and components
- **[Firebase](https://firebase.google.com/docs)** — Auth, Firestore database, and Cloud Storage
- **[Material UI](https://mui.com/material-ui/getting-started/)** — Component library and styling
- **[Datasworn](https://github.com/rsek/datasworn)** — Digitized Ironsworn game rules used throughout the app
- **Tiptap + Yjs** — Collaborative rich text editing in notes


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