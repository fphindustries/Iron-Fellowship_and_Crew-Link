![Iron Fellowship](./readme_assets/banner.png)

[Iron Fellowship](https://iron-fellowship.scottbenton.dev) | [Crew Link](https://starforged-crew-link.scottbenton.dev/)

Welcome! Iron Fellowship and Crew Link are applications for anyone playing the Tabletop RPGs [Ironsworn or Starforged](https://www.ironswornrpg.com/) to use.
Featuring clean character sheets, campaigns with shared assets and tracks, and cloud sync across all your devices.

## Features

### Character Sheet

![Character Sheet Screenshot](./readme_assets/CharacterSheet.png)
![Character Sheet Screenshot](./readme_assets/CharacterSheet-Starforged.png)

- Quickly view your characters stats.
- View moves, oracles, and use the built in dice roller to determine success or failure.
- View and update your character's assets, even creating your own custom asset cards.
- Update personal and shared tracks.
- Share a supply track with other members of your campaign.
- Write notes
- Keep track of locations, NPCs, and lore within your world

### Campaigns

![Character Sheet Screenshot](./readme_assets/CampaignView.png)
![Character Sheet Screenshot](./readme_assets/CampaignView-Starforged.png)

- Share a supply track, vows, and more with your party.
- Keep shared notes by adding a world to your campaign
- Invite new players to your campaign with a simple invite link.

### GM Screen

![Character Sheet Screenshot](./readme_assets/GMScreen.png)
![Character Sheet Screenshot](./readme_assets/GMScreen-Starforged.png)

- Keep track of your character's stats and assets
- Run combat, or update group progress tracks
- Keep detailed session notes
- Add hidden NPCs or Locations that you can make visible when your party goes somewhere new

### Future Changes

There is more to come for Iron Fellowship and Crew Link.
We have lots of items on the backlog, which you can view [here](https://github.com/users/scottbenton/projects/5).
To suggest changes and give feedback, you can chime in on existing issues or create new ones [here](https://github.com/scottbenton/Iron-Fellowship/issues).
Keep checking back!

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) Engine 24+ with Docker Compose v2 (`docker compose`, not `docker-compose`)

**Windows users:** `npm run dev/build/lint` work natively. The deploy scripts in `deploy/scripts/` are bash scripts and must be run from [Git Bash](https://git-scm.com/download/win) (included with Git for Windows) or WSL2 — not PowerShell or cmd. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows, which provides `docker compose` and uses a WSL2 backend.

### 1. Clone and install

```bash
git clone https://github.com/scottbenton/Iron-Fellowship.git
cd Iron-Fellowship_and_Crew-Link
npm i
```

### 2. Start the local Supabase stack

The app requires a running Supabase instance. The repo ships a complete Docker Compose stack in [`deploy/`](./deploy/).

```bash
# Copy the example env file and fill in the required values
cp deploy/.env.example deploy/.env

# Start all Supabase services and apply database migrations
cd deploy && ./scripts/setup.sh
```

`setup.sh` will start PostgreSQL, the API gateway, Auth, Storage, Realtime, and Supabase Studio. On first run it applies all migrations from [`supabase/migrations/`](./supabase/migrations/).

Once running:
- **API** — `http://localhost:8000` (use this as `VITE_SUPABASE_URL`)
- **Studio** — `http://localhost:3000` (database admin UI)

To view logs at any time:
```bash
docker compose -f deploy/docker-compose.yml logs -f
```

### 3. Configure the app

Copy the example env file and fill in the anon key printed by `setup.sh`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<anon key from deploy/.env>

# Iron Fellowship (Ironsworn)
VITE_TITLE="Iron Fellowship"
VITE_FAVICON_PATH=/theme/eidolon.svg
VITE_OPENGRAPH_PATH=/assets/ironsworn/opengraph-default.png

# --- OR for Crew Link (Starforged) ---
# VITE_TITLE="Starforged Crew Link"
# VITE_OPENGRAPH_PATH=/assets/starforged/opengraph-default.png
```

### 4. Run the dev server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. To switch between Iron Fellowship and Crew Link while running locally, click the settings icon in the bottom left and select **Switch System**.

### Useful commands

```bash
npm run lint      # ESLint (zero-warning policy)
npm run build     # TypeScript check + production build
```

---

## Deployment

This section covers deploying the full self-hosted stack to a Linux server.

### Server requirements

- Linux (Ubuntu 22.04+ recommended)
- Docker Engine 24+ and Docker Compose v2
- Ports 8000 (Supabase API) and 443 (app) accessible from the internet
- A domain name pointed at the server

### 1. Copy the deploy directory to your server

```bash
scp -r deploy/ user@yourserver:/opt/iron-fellowship/
ssh user@yourserver
cd /opt/iron-fellowship
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in every variable. Key values to generate:

```bash
# Postgres password and JWT secret (generate independently)
openssl rand -base64 32   # run twice: once for POSTGRES_PASSWORD, once for JWT_SECRET
```

Then generate the JWT keys (requires `jsonwebtoken` installed globally or via npx):

```bash
node -e "
const jwt = require('jsonwebtoken');
const secret = 'YOUR_JWT_SECRET';
const base = { iss: 'supabase', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 315360000 };
console.log('ANON_KEY=',     jwt.sign({ ...base, role: 'anon' }, secret));
console.log('SERVICE_KEY=',  jwt.sign({ ...base, role: 'service_role' }, secret));
"
```

Set `SITE_URL` to your app's public URL and `API_EXTERNAL_URL` to your Supabase API URL (e.g. `https://api.yourdomain.com`).

For Google OAuth, register credentials at the [Google Cloud Console](https://console.cloud.google.com/) and set `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` and `GOTRUE_EXTERNAL_GOOGLE_SECRET`.

For email magic links, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`.

### 3. Run setup

```bash
./scripts/setup.sh
```

This pulls all Docker images, starts the stack, and applies every migration in `supabase/migrations/`. The ANON key and Studio URL are printed at the end.

### 4. Build and serve the frontend

```bash
# On your build machine or CI
VITE_SUPABASE_URL=https://api.yourdomain.com \
VITE_SUPABASE_ANON_KEY=<your anon key> \
VITE_TITLE="Iron Fellowship" \
npm run build

# Copy dist/ to your web server (nginx, Caddy, etc.)
```

The `dist/` output is a static site — serve it with any web server. Point the Supabase API reverse-proxy at `localhost:8000`.

### Backups and upgrades

```bash
# Create a timestamped backup
./scripts/backup.sh [output_dir]

# Restore from a backup (interactive confirmation required)
./scripts/restore.sh <backup_dir>

# Pull new Docker images and apply new migrations
./scripts/upgrade.sh
```

---

## Thanks

Thank you to...

- Everyone who has contributed code to Iron Fellowship
- Shawn Tomkin for the permissive license on his game, Ironsworn
- GCoulby for creating [Ironsworn Companion](https://github.com/gcoulby/IronswornCompanion), and allowing me picks his brain, use his code, and steal assets to use in this app
- RSek for creating [Datasworn](https://github.com/rsek/datasworn), which this project uses

## Contributing

[See CONTRIBUTING.MD](./CONTRIBUTING.md)

## Licensing

### Ironsworn

This work is based on [Ironsworn](https://www.ironswornrpg.com), created by Shawn Tomkin, and licensed for our use under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International license.](https://creativecommons.org/licenses/by-nc-sa/4.0/)

### Starforged

This work is based on [Ironsworn: Starforged](https://www.ironswornrpg.com), created by Shawn Tomkin, and licensed for our use under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International license.](https://creativecommons.org/licenses/by-nc-sa/4.0/)
