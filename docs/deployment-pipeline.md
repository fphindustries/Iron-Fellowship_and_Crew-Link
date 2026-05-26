# Deployment Pipeline

This document covers deploying the NestJS + PostgreSQL stack to the dev server (Rick, a local Ubuntu machine) automatically whenever commits land on the `dev` branch.

---

## Architecture on Rick

```
                 ┌─────────────────────────────┐
  Browser ──────►│  Nginx (port 80/443)         │
                 │  /        → /var/www/starforged (static Vite build)
                 │  /api/*   → localhost:3001 (NestJS)
                 └─────────────────────────────┘
                              │
                 ┌────────────▼────────────┐
                 │  NestJS API             │
                 │  systemd: starforged-api│
                 │  port 3001              │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │  PostgreSQL 15+         │
                 │  db: starforged_dev     │
                 └─────────────────────────┘
```

---

## One-time Server Setup (Rick)

All commands run on Rick as a user with `sudo`.

### 1. Install Node.js 20 and pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm
```

### 2. Install PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Create the database and user:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER starforged WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE starforged_dev OWNER starforged;
SQL
```

### 3. Install Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable --now nginx
```

### 4. Clone the repo

Pick a directory that the deploy user owns — the GitHub Actions runner will operate here.

```bash
sudo mkdir -p /opt/starforged
sudo chown $USER:$USER /opt/starforged
git clone https://github.com/fphindustries/Iron-Fellowship_and_Crew-Link.git /opt/starforged
```

### 5. Create environment files

**`/opt/starforged/api/.env`** (backend):

```env
NODE_ENV=production
DATABASE_URL=postgresql://starforged:choose-a-strong-password@localhost:5432/starforged_dev
FRONTEND_URL=http://rick   # or whatever hostname/IP you use

JWT_ACCESS_SECRET=<generate: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 64>

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://rick/api/auth/google/callback

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@example.com

# Optional — leave blank to disable AI features
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

**`/opt/starforged/.env.local`** (frontend build):

```env
VITE_API_URL=http://rick
VITE_GAME_SYSTEM=starforged
VITE_TITLE="Starforged DEV"
VITE_FAVICON_PATH=/theme/eidolon.svg
VITE_OPENGRAPH_PATH=/assets/starforged/opengraph-default.png
```

### 6. Install dependencies, build, and run initial migration

```bash
cd /opt/starforged
pnpm install
pnpm --filter api run drizzle:migrate
pnpm api:build   # compiles TypeScript → api/dist/ (required before starting the service)
pnpm build       # builds the Vite frontend → dist/
```

> The systemd service runs `node dist/main`, so the API **must** be built at least once before you start it. After the initial setup, the GitHub Actions workflow handles all subsequent builds automatically.

### 7. Create the systemd service for the API

```bash
sudo tee /etc/systemd/system/starforged-api.service > /dev/null <<'UNIT'
[Unit]
Description=Starforged NestJS API
After=network.target postgresql.service

[Service]
Type=simple
User=YOUR_DEPLOY_USER
WorkingDirectory=/opt/starforged/api
ExecStart=/usr/bin/node dist/main
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/starforged/api/.env

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now starforged-api
```

Replace `YOUR_DEPLOY_USER` with the user that owns `/opt/starforged`.

### 8. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/starforged > /dev/null <<'NGINX'
server {
    listen 80;
    server_name rick;   # update to your server's hostname or IP

    # Serve the Vite frontend
    root /var/www/starforged;
    index index.html;

    # SPA fallback — all routes not matching a file serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy the API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        # Allow large request bodies for base64 image uploads
        client_max_body_size 15m;
    }

    # Proxy Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/starforged /etc/nginx/sites-enabled/starforged
sudo nginx -t && sudo systemctl reload nginx
```

Create the web root:

```bash
sudo mkdir -p /var/www/starforged
sudo chown YOUR_DEPLOY_USER:www-data /var/www/starforged
sudo chmod 775 /var/www/starforged
```

---

## Install the GitHub Actions Self-Hosted Runner

The runner connects **outbound** to GitHub — no inbound firewall rules are needed.

1. In your GitHub repository go to **Settings → Actions → Runners → New self-hosted runner**.
2. Select **Linux / x64** and follow the download/configure steps shown there. They look like:

```bash
mkdir -p /opt/actions-runner && cd /opt/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-x64-X.Y.Z.tar.gz
tar xzf ./actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/fphindustries/Iron-Fellowship_and_Crew-Link --token <TOKEN_FROM_GITHUB>
```

3. Install and start it as a systemd service so it survives reboots:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

The runner will appear as **online** in the GitHub UI. Label it `rick` during configuration so the workflow can target it specifically.

---

## GitHub Actions Workflow

Create `.github/workflows/deploy-dev.yml`:

```yaml
name: Deploy to Dev (Rick)

on:
  push:
    branches:
      - dev

concurrency:
  group: deploy-dev
  cancel-in-progress: true

jobs:
  deploy:
    name: Build and deploy to Rick
    runs-on: [self-hosted, rick]
    environment: dev

    steps:
      - name: Pull latest code
        run: |
          cd /opt/starforged
          git fetch origin
          git checkout dev
          git reset --hard origin/dev

      - name: Install dependencies
        run: |
          cd /opt/starforged
          pnpm install --frozen-lockfile

      - name: Build frontend
        run: |
          cd /opt/starforged
          pnpm build
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
          VITE_GAME_SYSTEM: starforged
          VITE_TITLE: "Starforged DEV"
          VITE_FAVICON_PATH: /theme/eidolon.svg
          VITE_OPENGRAPH_PATH: /assets/starforged/opengraph-default.png

      - name: Build API
        run: |
          cd /opt/starforged
          pnpm api:build

      - name: Run database migrations
        run: |
          cd /opt/starforged/api
          pnpm run drizzle:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy frontend to web root
        run: |
          rsync -a --delete /opt/starforged/dist/ /var/www/starforged/

      - name: Restart API service
        run: sudo systemctl restart starforged-api
```

### GitHub Environment and Variables

Create an environment named **`dev`** in **Settings → Environments** and add:

| Type | Name | Value |
|------|------|-------|
| Secret | `DATABASE_URL` | `postgresql://starforged:...@localhost:5432/starforged_dev` |
| Variable | `VITE_API_URL` | `http://rick` (or your dev server's hostname/IP) |

### Allow passwordless `systemctl restart` for the runner

The runner user needs to restart the API service without a password prompt:

```bash
sudo tee /etc/sudoers.d/starforged-deploy > /dev/null <<'EOF'
YOUR_DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart starforged-api
EOF
```

---

## Operational Flow

```
feature branch
      │
      ▼  pull request
    dev  ──────────────► GitHub Actions → self-hosted runner on Rick
                              │
                              ├── git reset --hard origin/dev
                              ├── pnpm install
                              ├── pnpm build (frontend)
                              ├── pnpm api:build (NestJS)
                              ├── drizzle:migrate
                              ├── rsync dist/ → /var/www/starforged/
                              └── systemctl restart starforged-api
```

Push to `dev` → the runner picks up the job, builds everything locally on Rick (no artifacts need to be transferred from GitHub-hosted runners), runs migrations, swaps the frontend files, and bounces the API. Total deploy time is typically under two minutes.

---

## Checking Deployment Status

```bash
# API service health
sudo systemctl status starforged-api
journalctl -u starforged-api -n 50 --no-pager

# Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Recent GitHub Actions runner activity
sudo journalctl -u actions.runner.*.service -n 50 --no-pager
```

---

## Rollback

The workflow does a hard reset, so rolling back means pushing an older commit to `dev`:

```bash
git push origin <good-commit-sha>:dev --force
```

This re-triggers the workflow with that commit's code. Migrations are forward-only — if the rollback commit does not include the rollback SQL, you will need to run it manually on Rick.
