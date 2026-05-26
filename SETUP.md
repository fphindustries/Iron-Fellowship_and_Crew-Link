# Setup

## Prerequisites

- **Node.js 20+** and **pnpm** (`npm install -g pnpm`)
- **PostgreSQL 15+** running locally or accessible via connection string
- **MinIO** (or any S3-compatible object store) for image storage
- **Google OAuth 2.0 credentials** for authentication
- **SMTP server** for magic-link email authentication (e.g. Mailpit locally, or any provider)
- **OpenAI or Anthropic API key** (optional — only required for AI features)

## Repo Structure

This is a pnpm monorepo:

```
starforged/
├── src/                    ← React frontend (Vite)
├── api/                    ← NestJS backend
│   └── src/
├── packages/
│   └── shared/             ← Shared TypeScript types (frontend + backend)
├── pnpm-workspace.yaml
└── package.json
```

## Steps

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/scottbenton/Iron-Fellowship.git
   cd Iron-Fellowship
   pnpm install
   ```

2. Create environment files (see sections below):
   - `.env.local` — frontend Vite variables
   - `api/.env` — backend NestJS variables

3. Set up PostgreSQL and run migrations:
   ```bash
   pnpm --filter api run drizzle:migrate
   ```

4. Set up MinIO (see MinIO Setup below).

5. Set up Google OAuth credentials (see Google OAuth Setup below).

6. Start both servers together:
   ```bash
   pnpm dev:all
   ```
   Or in separate terminals if you want independent output:
   ```bash
   pnpm api:dev   # NestJS API on http://localhost:3001
   pnpm dev       # Vite frontend on http://localhost:5173
   ```

## Frontend Environment (`.env.local`)

Create `.env.local` at the repo root:

```env
# Backend API URL (defaults to http://localhost:3001 if omitted)
VITE_API_URL=http://localhost:3001

# Game system — controls which ruleset loads by default ("starforged" or "ironsworn")
VITE_GAME_SYSTEM=starforged

# App branding — match to whichever game system you set above
VITE_TITLE="Starforged Crew Link"
VITE_FAVICON_PATH=/theme/eidolon.svg
VITE_OPENGRAPH_PATH=/assets/starforged/opengraph-default.png

# Iron Fellowship variant:
# VITE_GAME_SYSTEM=ironsworn
# VITE_TITLE="Iron Fellowship"
# VITE_FAVICON_PATH=/theme/oracle.svg
# VITE_OPENGRAPH_PATH=/assets/ironsworn/opengraph-default.png

# Optional: PostHog analytics (see PostHog Setup below)
# VITE_POSTHOG_KEY=
# VITE_POSTHOG_HOST=
```

## Backend Environment (`api/.env`)

Create `api/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# URLs
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/starforged

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here

# Google OAuth (see Google OAuth Setup below)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# MinIO / S3-compatible storage (see MinIO Setup below)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=starforged
# MINIO_REGION=us-east-1   # optional, defaults to us-east-1

# SMTP — for magic-link email auth (Mailpit example for local dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# AI features (optional — only needed if using AI character/world generation)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```

## Running in Production (Server Deployment)

The dev scripts (`pnpm dev:all`, `nest start --watch`) compile on the fly and are not suitable for a server. For a permanent deployment you need to build both the API and the frontend first.

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Run database migrations:**
   ```bash
   pnpm --filter api run drizzle:migrate
   ```

3. **Build the API:**
   ```bash
   pnpm api:build          # compiles TypeScript → api/dist/
   ```

4. **Build the frontend** (only needed if the API is serving the static files):
   ```bash
   pnpm build              # type-checks + Vite build → dist/
   ```

5. **Start the API server:**
   ```bash
   pnpm --filter api run start:prod   # runs: node api/dist/main
   ```
   Or directly:
   ```bash
   node api/dist/src/main.js
   ```

Repeat steps 1–3 and restart the process whenever you pull new code that includes schema or source changes.

> **Tip:** Use a process manager such as [PM2](https://pm2.keymetrics.io/) or a systemd service to keep the API running and restart it automatically on crashes or reboots.

---

## PostgreSQL Setup

1. Create a database owned by the user in your `DATABASE_URL` (this avoids schema permission issues on PostgreSQL 15+):
   ```bash
   # Replace 'myuser' with the user in your DATABASE_URL
   psql -U postgres -c "CREATE DATABASE starforged OWNER myuser;"
   ```

   If the database already exists and you get `permission denied for schema public`, grant the user schema access:
   ```bash
   psql -U postgres -d starforged -c "GRANT ALL ON SCHEMA public TO myuser;"
   ```

2. Run Drizzle migrations to create all tables:
   ```bash
   pnpm --filter api run drizzle:migrate
   ```

   To generate new migrations after schema changes:
   ```bash
   pnpm --filter api run drizzle:generate
   ```

   To inspect your database with Drizzle Studio:
   ```bash
   pnpm --filter api run drizzle:studio
   ```

## MinIO Setup

1. [Download and run MinIO](https://min.io/download) locally:
   ```bash
   minio server ~/minio-data --console-address :9001
   ```
   Default credentials: `minioadmin` / `minioadmin`

2. Open the MinIO console at `http://localhost:9001` and create a bucket named `starforged`.

3. Set the bucket's access policy to allow public reads if you want image URLs to be directly accessible without presigned URLs. Otherwise leave it private and the API will serve presigned URLs.

Alternatively, point `MINIO_ENDPOINT` at any S3-compatible provider (AWS S3, Backblaze B2, Cloudflare R2, etc.).

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Navigate to **APIs & Services → Credentials**.
3. Click **Create Credentials → OAuth 2.0 Client ID**.
4. Choose **Web application**.
5. Add `http://localhost:3001/api/auth/google/callback` to **Authorized redirect URIs**.
6. Copy the **Client ID** and **Client Secret** into `api/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## SMTP / Magic Link Setup (Local Development)

For local development, [Mailpit](https://mailpit.axllent.org/) is the easiest option — it captures all outgoing email without actually sending it:

```bash
# macOS
brew install mailpit && mailpit

# Linux / WSL
curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh | bash
mailpit
```

Mailpit listens on SMTP port `1025` and exposes a web UI at `http://localhost:8025`.

Set in `api/.env`:
```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

## AI Features (Optional)

AI character and world generation is disabled by default if no API key is set. To enable it, add at least one key to `api/.env`:

```env
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

The AI provider per world is configured in-app via **World Settings → AI Settings**.

## PostHog Analytics (Optional)

PostHog provides page-view analytics and remote feature flags. Create a project at [posthog.com](https://posthog.com) and add to `.env.local`:

```env
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

If these variables are omitted, analytics are silently disabled.

## Scripts Reference

### Root (run from repo root)

| Script | Command | Description |
|---|---|---|
| `pnpm dev` | `vite` | Start the Vite frontend dev server (hot reload) |
| `pnpm dev:all` | `concurrently …` | Start both the API and frontend together in watch mode |
| `pnpm dev:monitored` | `concurrently …` | Like `dev:all` but wraps the API in the error monitor (auto-fix + markdown logs) |
| `pnpm api:dev` | `nest start --watch` | Start the NestJS API in watch mode (restarts on file changes) |
| `pnpm api:monitored` | `node scripts/monitor.mjs` | Start the NestJS API with the error monitor (auto-fix + markdown logs) |
| `pnpm build` | `tsc && vite build` | Type-check and build the frontend for production |
| `pnpm api:build` | `nest build` | Compile the NestJS API to `api/dist/` |
| `pnpm lint` | `eslint ./src` | Lint the frontend source (zero warnings tolerance) |
| `pnpm preview` | `vite preview` | Serve the last production frontend build locally |

### API (run from repo root with `pnpm --filter api run <script>`, or from `api/` with `pnpm run <script>`)

| Script | Description |
|---|---|
| `start:dev` | Start NestJS in watch mode (same as `pnpm api:dev` from root) |
| `monitor` | Start NestJS via the error monitor — logs errors to `logs/errors/` and attempts AI-powered auto-fixes |
| `start:prod` | Run the compiled production build (`node dist/main`) |
| `build` | Compile TypeScript to `api/dist/` |
| `drizzle:generate` | Generate a new SQL migration file from schema changes |
| `drizzle:migrate` | Apply pending migrations to the database |
| `drizzle:push` | Push schema directly to the database without a migration file (useful during early development) |
| `drizzle:studio` | Open Drizzle Studio — a browser-based database inspector |
| `lint` | Lint the API source |

---

With that, you should be ready to develop locally. Visit `http://localhost:5173` after starting both servers.
