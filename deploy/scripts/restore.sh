#!/usr/bin/env bash
# =============================================================================
# restore.sh — Restore a Supabase PostgreSQL database backup
#
# Usage: cd deploy && ./scripts/restore.sh <backup_dir>
#
# WARNING: This OVERWRITES the current database!
# =============================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-}"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

info()  { echo -e "${GREEN}[restore]${NC} $*"; }
warn()  { echo -e "${YELLOW}[restore]${NC} $*"; }
die()   { echo -e "${RED}[restore] ERROR:${NC} $*" >&2; exit 1; }

cd "$DEPLOY_DIR"

# Load .env
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  die ".env not found. Run ./scripts/setup.sh first."
fi
set -o allexport; source "$DEPLOY_DIR/.env"; set +o allexport

# ---------------------------------------------------------------------------
# Step 1: Validate backup directory
# ---------------------------------------------------------------------------
if [[ -z "$BACKUP_DIR" ]]; then
  die "Usage: ./scripts/restore.sh <backup_dir>"
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  die "Backup directory not found: $BACKUP_DIR"
fi

DUMP_FILE="$BACKUP_DIR/database.dump"
if [[ ! -f "$DUMP_FILE" ]]; then
  die "Dump file not found: $DUMP_FILE"
fi

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
info "Found backup: $DUMP_FILE ($DUMP_SIZE)"

if [[ -f "$BACKUP_DIR/manifest.json" ]]; then
  info "Manifest:"
  cat "$BACKUP_DIR/manifest.json"
  echo ""
fi

# ---------------------------------------------------------------------------
# Step 2: Warning and confirmation
# ---------------------------------------------------------------------------
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  WARNING: This will OVERWRITE the current database!         ║${NC}"
echo -e "${RED}║  All current data will be PERMANENTLY DELETED.              ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
warn "You are about to restore from: $BACKUP_DIR"
echo ""
read -r -p "Type 'yes' to confirm: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  info "Restore cancelled."
  exit 0
fi

# ---------------------------------------------------------------------------
# Step 3: Stop application-facing services (keep db running)
# ---------------------------------------------------------------------------
info "Stopping application-facing services (keeping db)..."
docker compose stop studio kong auth rest realtime storage imgproxy meta functions 2>/dev/null || true
sleep 3

# ---------------------------------------------------------------------------
# Step 4: Restore the database
# ---------------------------------------------------------------------------
info "Restoring database from $DUMP_FILE ..."
docker compose exec -T db pg_restore \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-acl \
  --no-owner \
  < "$DUMP_FILE"

info "Database restored ✓"

# ---------------------------------------------------------------------------
# Step 5: Restart all services
# ---------------------------------------------------------------------------
info "Restarting all services..."
docker compose up -d

# ---------------------------------------------------------------------------
# Step 6: Verify healthchecks
# ---------------------------------------------------------------------------
info "Waiting for database to be healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0
until docker compose exec -T db pg_isready -U postgres -h localhost -q 2>/dev/null; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
    die "Database did not become healthy. Check: docker compose logs db"
  fi
  sleep 2
done

info "All services restored and running ✓"
echo ""
info "Studio: http://localhost:${STUDIO_PORT:-3000}"
info "API:    http://localhost:${KONG_HTTP_PORT:-8000}"
