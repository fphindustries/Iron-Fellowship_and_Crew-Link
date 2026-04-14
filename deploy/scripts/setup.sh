#!/usr/bin/env bash
# =============================================================================
# setup.sh — First-time Supabase self-hosted setup
#
# Usage: cd deploy && ./scripts/setup.sh
#
# Must be run from the deploy/ directory.
# Requires: Docker Engine 24+ and Docker Compose v2 (docker compose, not docker-compose)
# =============================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }
error()   { echo -e "${RED}[setup] ERROR:${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

cd "$DEPLOY_DIR"

# ---------------------------------------------------------------------------
# Step 1: Check Docker + Docker Compose v2
# ---------------------------------------------------------------------------
info "Checking Docker installation..."
if ! command -v docker &>/dev/null; then
  die "Docker is not installed. Install from https://docs.docker.com/engine/install/"
fi

DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0")
info "Docker version: $DOCKER_VERSION"

if ! docker compose version &>/dev/null; then
  die "Docker Compose v2 is required (run 'docker compose version' to check). Install from https://docs.docker.com/compose/install/"
fi

COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "0")
info "Docker Compose version: $COMPOSE_VERSION"

# ---------------------------------------------------------------------------
# Step 2: Check .env exists and is populated
# ---------------------------------------------------------------------------
info "Checking .env file..."
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  warn ".env not found. Copying from .env.example..."
  cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
  echo ""
  die "Please edit $DEPLOY_DIR/.env and fill in all required values, then run this script again."
fi

# Check all required variables are non-empty
REQUIRED_VARS=(
  POSTGRES_PASSWORD
  JWT_SECRET
  ANON_KEY
  SERVICE_ROLE_KEY
  DASHBOARD_USERNAME
  DASHBOARD_PASSWORD
  SITE_URL
  API_EXTERNAL_URL
)

MISSING_VARS=()
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  export "$key=$value" 2>/dev/null || true
done < "$DEPLOY_DIR/.env"

for var in "${REQUIRED_VARS[@]}"; do
  val="${!var:-}"
  if [[ -z "$val" ]]; then
    MISSING_VARS+=("$var")
  fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  error "The following required variables are not set in .env:"
  for v in "${MISSING_VARS[@]}"; do
    echo "    - $v"
  done
  die "Please set all required variables and try again."
fi

# ---------------------------------------------------------------------------
# Step 3: Validate JWT_SECRET length
# ---------------------------------------------------------------------------
info "Validating JWT_SECRET..."
JWT_LEN=${#JWT_SECRET}
if [[ $JWT_LEN -lt 32 ]]; then
  die "JWT_SECRET must be at least 32 characters long (currently $JWT_LEN). Generate with: openssl rand -base64 32"
fi
info "JWT_SECRET length: $JWT_LEN characters ✓"

# ---------------------------------------------------------------------------
# Step 4: Pull all Docker images
# ---------------------------------------------------------------------------
info "Pulling Docker images (this may take a few minutes on first run)..."
docker compose pull

# ---------------------------------------------------------------------------
# Step 5: Start services in dependency order
# ---------------------------------------------------------------------------
info "Starting Supabase services..."
docker compose up -d

# ---------------------------------------------------------------------------
# Step 6: Wait for database to be healthy
# ---------------------------------------------------------------------------
info "Waiting for database to be ready..."
MAX_ATTEMPTS=60
ATTEMPT=0
until docker compose exec -T db pg_isready -U postgres -h localhost -q 2>/dev/null; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
    die "Database did not become healthy after ${MAX_ATTEMPTS} attempts. Check: docker compose logs db"
  fi
  sleep 2
done
info "Database is ready ✓"

# Wait for Kong
info "Waiting for Kong API gateway..."
ATTEMPT=0
until curl -s -o /dev/null -w "%{http_code}" "http://localhost:${KONG_HTTP_PORT:-8000}/health" 2>/dev/null | grep -q "200\|404"; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
    warn "Kong health check timed out — services may still be starting"
    break
  fi
  sleep 2
done
info "Kong is ready ✓"

# ---------------------------------------------------------------------------
# Step 7: Create migration tracking schema and table
# ---------------------------------------------------------------------------
info "Setting up migration tracking..."
docker compose exec -T db psql -U postgres -d postgres -c "
  CREATE SCHEMA IF NOT EXISTS supabase_migrations;
  CREATE TABLE IF NOT EXISTS supabase_migrations.applied (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Step 8: Apply migrations from supabase/migrations/
# ---------------------------------------------------------------------------
if [[ -d "$MIGRATIONS_DIR" ]]; then
  info "Applying database migrations from $MIGRATIONS_DIR ..."
  MIGRATION_FILES=($(find "$MIGRATIONS_DIR" -name "*.sql" | sort))

  for migration_file in "${MIGRATION_FILES[@]}"; do
    filename=$(basename "$migration_file")

    # Check if already applied
    ALREADY_APPLIED=$(docker compose exec -T db psql -U postgres -d postgres -tAc \
      "SELECT COUNT(*) FROM supabase_migrations.applied WHERE filename = '$filename'" 2>/dev/null || echo "0")

    if [[ "$ALREADY_APPLIED" == "1" ]]; then
      info "  Skipping $filename (already applied)"
      continue
    fi

    info "  Applying $filename ..."
    if docker compose exec -T db psql -U postgres -d postgres < "$migration_file"; then
      docker compose exec -T db psql -U postgres -d postgres -c \
        "INSERT INTO supabase_migrations.applied (filename) VALUES ('$filename') ON CONFLICT DO NOTHING" 2>/dev/null
      info "  ✓ $filename applied"
    else
      die "Migration $filename failed. Fix the error and run setup.sh again."
    fi
  done
else
  warn "No migrations directory found at $MIGRATIONS_DIR — skipping migrations"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} Supabase is running!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Studio (dashboard):  http://localhost:${STUDIO_PORT:-3000}"
echo "  API (Kong):          http://localhost:${KONG_HTTP_PORT:-8000}"
echo "  Anon Key:            ${ANON_KEY}"
echo ""
echo "  Studio access via SSH tunnel:"
echo "  ssh -L 3000:localhost:3000 user@your-server"
echo ""
echo "  Application .env:"
echo "  VITE_SUPABASE_URL=http://your-server:${KONG_HTTP_PORT:-8000}"
echo "  VITE_SUPABASE_ANON_KEY=${ANON_KEY}"
echo ""
