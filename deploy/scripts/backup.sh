#!/usr/bin/env bash
# =============================================================================
# backup.sh — Backup the Supabase PostgreSQL database
#
# Usage: cd deploy && ./scripts/backup.sh [output_dir]
# Default output: ./backups/YYYYMMDD_HHMMSS/
# =============================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="${1:-$DEPLOY_DIR/backups/$TIMESTAMP}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[backup]${NC} $*"; }
die()  { echo -e "${RED}[backup] ERROR:${NC} $*" >&2; exit 1; }

cd "$DEPLOY_DIR"

# Load .env
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  die ".env not found. Run ./scripts/setup.sh first."
fi
set -o allexport; source "$DEPLOY_DIR/.env"; set +o allexport

# ---------------------------------------------------------------------------
# Step 1: Create output directory
# ---------------------------------------------------------------------------
info "Creating backup directory: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# ---------------------------------------------------------------------------
# Step 2: Check database is running
# ---------------------------------------------------------------------------
if ! docker compose exec -T db pg_isready -U postgres -h localhost -q 2>/dev/null; then
  die "Database is not running. Start with: docker compose up -d db"
fi

# ---------------------------------------------------------------------------
# Step 3: Dump the database
# ---------------------------------------------------------------------------
DUMP_FILE="$OUTPUT_DIR/database.dump"
info "Dumping database to $DUMP_FILE ..."

docker compose exec -T db pg_dump \
  -U postgres \
  postgres \
  --format=custom \
  --compress=9 \
  > "$DUMP_FILE"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
info "Database dump complete: $DUMP_SIZE"

# ---------------------------------------------------------------------------
# Step 4: Create manifest
# ---------------------------------------------------------------------------
MANIFEST_FILE="$OUTPUT_DIR/manifest.json"
info "Writing manifest to $MANIFEST_FILE ..."

DB_SIZE=$(docker compose exec -T db psql -U postgres -d postgres -tAc \
  "SELECT pg_size_pretty(pg_database_size('postgres'))" 2>/dev/null || echo "unknown")

IMAGE_VERSIONS=$(docker compose images --format json 2>/dev/null | head -20 || echo "[]")

cat > "$MANIFEST_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_file": "database.dump",
  "dump_size": "$DUMP_SIZE",
  "database_size": "$DB_SIZE",
  "services": $IMAGE_VERSIONS
}
EOF

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
info "Backup complete!"
info "  Location: $OUTPUT_DIR"
info "  Dump:     $DUMP_FILE ($DUMP_SIZE)"
info "  Manifest: $MANIFEST_FILE"
