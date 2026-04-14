#!/usr/bin/env bash
# =============================================================================
# upgrade.sh — Upgrade Supabase services and apply new migrations
#
# Usage: cd deploy && ./scripts/upgrade.sh
# =============================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[upgrade]${NC} $*"; }
warn()  { echo -e "${YELLOW}[upgrade]${NC} $*"; }
die()   { echo -e "${RED}[upgrade] ERROR:${NC} $*" >&2; exit 1; }

cd "$DEPLOY_DIR"

# Load .env
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  die ".env not found. Run ./scripts/setup.sh first."
fi
set -o allexport; source "$DEPLOY_DIR/.env"; set +o allexport

# ---------------------------------------------------------------------------
# Step 1: Show current image versions
# ---------------------------------------------------------------------------
info "Current service versions:"
docker compose images 2>/dev/null || docker compose ps --format "table {{.Name}}\t{{.Image}}"
echo ""

# ---------------------------------------------------------------------------
# Step 2: Pull updated images
# ---------------------------------------------------------------------------
info "Pulling updated images..."
docker compose pull

# ---------------------------------------------------------------------------
# Step 3: Apply new migrations
# ---------------------------------------------------------------------------
info "Checking for new migrations..."
if [[ -d "$MIGRATIONS_DIR" ]]; then
  MIGRATION_FILES=($(find "$MIGRATIONS_DIR" -name "*.sql" | sort))

  for migration_file in "${MIGRATION_FILES[@]}"; do
    filename=$(basename "$migration_file")

    ALREADY_APPLIED=$(docker compose exec -T db psql -U postgres -d postgres -tAc \
      "SELECT COUNT(*) FROM supabase_migrations.applied WHERE filename = '$filename'" 2>/dev/null || echo "0")

    if [[ "$ALREADY_APPLIED" == "1" ]]; then
      continue
    fi

    info "  Applying new migration: $filename ..."
    if docker compose exec -T db psql -U postgres -d postgres < "$migration_file"; then
      docker compose exec -T db psql -U postgres -d postgres -c \
        "INSERT INTO supabase_migrations.applied (filename) VALUES ('$filename') ON CONFLICT DO NOTHING" 2>/dev/null
      info "  ✓ $filename applied"
    else
      die "Migration $filename failed."
    fi
  done
  info "All migrations up to date ✓"
fi

# ---------------------------------------------------------------------------
# Step 4: Restart services in safe order (db last)
# ---------------------------------------------------------------------------
info "Restarting services (db last)..."
SERVICES=(studio kong auth rest realtime storage imgproxy meta functions analytics vector supavisor)
for svc in "${SERVICES[@]}"; do
  if docker compose ps --services 2>/dev/null | grep -q "^$svc$"; then
    info "  Restarting $svc..."
    docker compose up -d --no-deps "$svc"
    sleep 2
  fi
done

info "  Restarting db..."
docker compose up -d --no-deps db

# ---------------------------------------------------------------------------
# Step 5: Verify healthchecks
# ---------------------------------------------------------------------------
info "Waiting for services to be healthy..."
sleep 10
MAX_ATTEMPTS=30
ATTEMPT=0
until docker compose exec -T db pg_isready -U postgres -h localhost -q 2>/dev/null; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
    warn "Database healthcheck timed out. Check: docker compose logs db"
    break
  fi
  sleep 2
done
info "Database healthy ✓"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
info "New service versions:"
docker compose images 2>/dev/null || true
echo ""
info "Upgrade complete ✓"
