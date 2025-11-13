#!/bin/bash
set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE_DIR="$PROJECT_ROOT/old-pages-sql-scripts"
MIGRATION_DATE=$(date +"%Y-%m-%d %H:%M:%S")
mkdir -p "$ARCHIVE_DIR"/{pages,sql-scripts,database-references,old-functions,test-scripts,backups}
add_migration_comment() {
  local file="$1"
  local original_path="$2"
  [ ! -f "$file" ] && return
  grep -q "MIGRATED TO ARCHIVE" "$file" 2>/dev/null && return
  local ext="${file##*.}"
  case "$ext" in
    tsx|ts|jsx|js)
      { echo "/**"; echo " * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY"; echo " * Migrated: $MIGRATION_DATE"; echo " * Original: $original_path"; echo " */"; echo ""; cat "$file"; } > "$file.tmp" && mv "$file.tmp" "$file"
      ;;
    sql)
      { echo "-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY"; echo "-- Migrated: $MIGRATION_DATE"; echo "-- Original: $original_path"; echo ""; cat "$file"; } > "$file.tmp" && mv "$file.tmp" "$file"
      ;;
    *)
      { echo "# ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY"; echo "# Migrated: $MIGRATION_DATE"; echo "# Original: $original_path"; echo ""; cat "$file"; } > "$file.tmp" && mv "$file.tmp" "$file"
      ;;
  esac
}
move_file() {
  local src="$1"
  local dest="$2"
  [ ! -e "$src" ] && return
  mkdir -p "$(dirname "$dest")"
  cp -r "$src" "$dest" 2>/dev/null || true
  if [ -f "$dest" ]; then
    add_migration_comment "$dest" "$src"
  elif [ -d "$dest" ]; then
    find "$dest" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.sql" \) | while read f; do
      add_migration_comment "$f" "$src"
    done
  fi
  rm -rf "$src" 2>/dev/null || true
  echo "  ✓ $(basename "$src")"
}
echo "📄 Moving old pages..."
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/bork-api" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/bork-api" "$ARCHIVE_DIR/pages/finance-bork-api" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/daily-ops" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/daily-ops" "$ARCHIVE_DIR/pages/finance-daily-ops" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/data" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/data" "$ARCHIVE_DIR/pages/finance-data" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/eitje-api" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/eitje-api" "$ARCHIVE_DIR/pages/finance-eitje-api" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/imports" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/imports" "$ARCHIVE_DIR/pages/finance-imports" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/labor" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/labor" "$ARCHIVE_DIR/pages/finance-labor" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/pnl" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/pnl" "$ARCHIVE_DIR/pages/finance-pnl" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/real-sync" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/real-sync" "$ARCHIVE_DIR/pages/finance-real-sync" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/sales" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/sales" "$ARCHIVE_DIR/pages/finance-sales" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/simple-import" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/simple-import" "$ARCHIVE_DIR/pages/finance-simple-import" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/finance/view-data" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/view-data" "$ARCHIVE_DIR/pages/finance-view-data" || true
[ -f "$PROJECT_ROOT/src/app/(dashboard)/finance/page.tsx" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/finance/page.tsx" "$ARCHIVE_DIR/pages/finance-page.tsx" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/products" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/products" "$ARCHIVE_DIR/pages/products" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/checkout" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/checkout" "$ARCHIVE_DIR/pages/checkout" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/view-data" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/view-data" "$ARCHIVE_DIR/pages/view-data" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/design-systems" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/design-systems" "$ARCHIVE_DIR/pages/design-systems" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/finance/data-view" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/finance/data-view" "$ARCHIVE_DIR/pages/data-finance-data-view" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/finance/pnl" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/finance/pnl" "$ARCHIVE_DIR/pages/data-finance-pnl" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/inventory" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/inventory" "$ARCHIVE_DIR/pages/data-inventory" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/reservations/data-view" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/reservations/data-view" "$ARCHIVE_DIR/pages/data-reservations-data-view" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/sales/data-view" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/sales/data-view" "$ARCHIVE_DIR/pages/data-sales-data-view" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/labor/hours" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/labor/hours" "$ARCHIVE_DIR/pages/data-labor-hours" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/labor/costs" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/labor/costs" "$ARCHIVE_DIR/pages/data-labor-costs" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/labor/workers" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/labor/workers" "$ARCHIVE_DIR/pages/data-labor-workers" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/data/labor/locations-teams" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/data/labor/locations-teams" "$ARCHIVE_DIR/pages/data-labor-locations-teams" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/settings/bork-api/bork-api" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/settings/bork-api/bork-api" "$ARCHIVE_DIR/pages/settings-bork-api-duplicate" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/settings/eitje-api/eitje-api" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/settings/eitje-api/eitje-api" "$ARCHIVE_DIR/pages/settings-eitje-api-duplicate" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/settings/connections" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/settings/connections" "$ARCHIVE_DIR/pages/settings-connections" || true
[ -d "$PROJECT_ROOT/src/app/(dashboard)/settings/data-import" ] && move_file "$PROJECT_ROOT/src/app/(dashboard)/settings/data-import" "$ARCHIVE_DIR/pages/settings-data-import" || true
echo "📜 Moving SQL scripts..."
[ -d "$PROJECT_ROOT/scripts/sql" ] && find "$PROJECT_ROOT/scripts/sql" -name "*.sql" -type f | while read f; do move_file "$f" "$ARCHIVE_DIR/sql-scripts/$(basename "$f")"; done || true
echo "🧪 Moving test scripts..."
[ -d "$PROJECT_ROOT/.test-scripts" ] && find "$PROJECT_ROOT/.test-scripts" -type f | while read f; do move_file "$f" "$ARCHIVE_DIR/test-scripts/$(basename "$f")"; done || true
echo "🗄️  Moving database references..."
[ -d "$PROJECT_ROOT/tools/compliance/backups" ] && find "$PROJECT_ROOT/tools/compliance/backups" \( -name "*migrate-database*" -o -name "*check-powerbi-bork-data*" \) -type f | while read f; do move_file "$f" "$ARCHIVE_DIR/database-references/$(basename "$f")"; done || true
echo "⚙️  Moving old functions..."
[ -d "$PROJECT_ROOT/src/lib/eitje/_backup_complex" ] && move_file "$PROJECT_ROOT/src/lib/eitje/_backup_complex" "$ARCHIVE_DIR/old-functions/eitje-backup-complex" || true
echo "💾 Moving backup files..."
find "$PROJECT_ROOT" -maxdepth 3 \( -name "*.backup" -o -name "*.backup.*" \) -type f 2>/dev/null | while read f; do move_file "$f" "$ARCHIVE_DIR/backups/$(basename "$f")"; done || true
echo "📝 Creating README..."
cat > "$ARCHIVE_DIR/README.md" << EOF
# Old Code Archive

⚠️ **REFERENCE ONLY - DO NOT COPY CODE DIRECTLY**

Migrated on: $MIGRATION_DATE

All files have migration comments at the top showing original location for easy reverting.
EOF
echo "✅ Migration complete!"
