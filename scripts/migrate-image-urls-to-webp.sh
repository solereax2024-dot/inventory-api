#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-inventory}"
UPLOAD_ROOT="${UPLOAD_ROOT:-/home/inventory-api}"
TARGET_KB="${TARGET_KB:-45}"
MAX_DIMENSION="${MAX_DIMENSION:-1200}"
DRY_RUN="true"
BACKUP_DIR=""
WORK_DIR=""

usage() {
  cat <<'EOF'
Convert DB-referenced /uploads png/jpg images to .webp and update DB URLs.

Usage:
  ./scripts/migrate-image-urls-to-webp.sh [options]

Options:
  --apply                  Perform conversion and DB updates (default is dry-run)
  --db <name>              Database name (default: inventory)
  --upload-root <path>     Repo root containing uploads/ (default: /home/inventory-api)
  --target-kb <number>     Approx target size in KB (default: 45)
  --max-dim <number>       Max width/height for converted output (default: 1200)
  --backup-dir <path>      Folder where original files are copied before conversion
  --work-dir <path>        Folder for generated mapping/sql files
  --help                   Show this help

Examples:
  ./scripts/migrate-image-urls-to-webp.sh
  ./scripts/migrate-image-urls-to-webp.sh --apply --target-kb 35 --max-dim 900
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      DRY_RUN="false"
      shift
      ;;
    --db)
      DB_NAME="$2"
      shift 2
      ;;
    --upload-root)
      UPLOAD_ROOT="$2"
      shift 2
      ;;
    --target-kb)
      TARGET_KB="$2"
      shift 2
      ;;
    --max-dim)
      MAX_DIMENSION="$2"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --work-dir)
      WORK_DIR="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! "$TARGET_KB" =~ ^[0-9]+$ ]] || [[ ! "$MAX_DIMENSION" =~ ^[0-9]+$ ]]; then
  echo "target-kb and max-dim must be integers" >&2
  exit 1
fi

if [[ -z "$WORK_DIR" ]]; then
  WORK_DIR="${UPLOAD_ROOT%/}/tmp/webp-migration-$(date +%Y%m%d-%H%M%S)"
fi
mkdir -p "$WORK_DIR"

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="${UPLOAD_ROOT%/}/uploads-backup-webp-$(date +%Y%m%d-%H%M%S)"
fi

SQL_URLS="$WORK_DIR/source_urls.tsv"
MAP_TSV="$WORK_DIR/url_mapping.tsv"
SQL_FILE="$WORK_DIR/apply_url_updates.sql"
REPORT_FILE="$WORK_DIR/report.txt"

IM_CMD=""
if command -v magick >/dev/null 2>&1; then
  IM_CMD="magick"
elif command -v convert >/dev/null 2>&1; then
  IM_CMD="convert"
fi

if [[ "$DRY_RUN" != "true" ]] && [[ -z "$IM_CMD" ]]; then
  echo "ImageMagick is required (magick or convert)." >&2
  exit 1
fi

if [[ ! -d "$UPLOAD_ROOT/uploads" ]]; then
  echo "uploads folder not found under: $UPLOAD_ROOT" >&2
  exit 1
fi

echo "[webp-migrate] mode: $([[ "$DRY_RUN" == "true" ]] && echo dry-run || echo apply)"
echo "[webp-migrate] work dir: $WORK_DIR"
echo "[webp-migrate] backup dir: $BACKUP_DIR"

echo "[webp-migrate] collecting DB image URLs..."
sudo -u postgres psql -d "$DB_NAME" -At -F $'\t' -c "
  select distinct image_url
  from products
  where image_url ~ '^/uploads/.*\\.(png|jpg|jpeg)$'
  union
  select distinct image_url
  from product_colorway_images
  where image_url ~ '^/uploads/.*\\.(png|jpg|jpeg)$'
  union
  select distinct logo_url
  from brands
  where logo_url ~ '^/uploads/.*\\.(png|jpg|jpeg)$'
  union
  select distinct setting_value
  from app_settings
  where setting_key in ('SITE_LOGO_URL', 'SITE_LOGO_DARK_URL')
    and setting_value ~ '^/uploads/.*\\.(png|jpg|jpeg)$'
" > "$SQL_URLS"

if [[ ! -s "$SQL_URLS" ]]; then
  echo "[webp-migrate] no png/jpg DB URLs found. Nothing to do."
  exit 0
fi

TARGET_BYTES=$((TARGET_KB * 1024))
declare -a QUALITIES=(82 74 66 58 50 42 34)
declare -a SCALES=(100 92 84 76 68 60 52 44)

converted=0
missing=0
failed=0
already_webp_exists=0

echo -e "old_url\tnew_url\told_bytes\tnew_bytes\tstatus" > "$MAP_TSV"

convert_one() {
  local old_url="$1"
  local rel_path old_path webp_path old_bytes best_bytes best_tmp status

  rel_path="${old_url#/}"
  old_path="$UPLOAD_ROOT/$rel_path"

  if [[ ! -f "$old_path" ]]; then
    echo -e "${old_url}\t\t0\t0\tmissing-file" >> "$MAP_TSV"
    missing=$((missing + 1))
    return 0
  fi

  old_bytes=$(wc -c <"$old_path")
  webp_path="${old_path%.*}.webp"
  local new_url="${old_url%.*}.webp"

  if [[ -f "$webp_path" ]]; then
    local existing_size
    existing_size=$(wc -c <"$webp_path")
    echo -e "${old_url}\t${new_url}\t${old_bytes}\t${existing_size}\texisting-webp" >> "$MAP_TSV"
    already_webp_exists=$((already_webp_exists + 1))
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${old_url}\t${new_url}\t${old_bytes}\t0\twould-convert" >> "$MAP_TSV"
    return 0
  fi

  mkdir -p "$BACKUP_DIR/$(dirname "$rel_path")"
  cp -p "$old_path" "$BACKUP_DIR/$rel_path"

  best_tmp=""
  best_bytes="$old_bytes"

  for scale in "${SCALES[@]}"; do
    local dim=$((MAX_DIMENSION * scale / 100))
    (( dim < 320 )) && dim=320

    for q in "${QUALITIES[@]}"; do
      local candidate
      candidate=$(mktemp "$WORK_DIR/webp-XXXXXX.webp")
      if ! "$IM_CMD" "$old_path" -auto-orient -strip -resize "${dim}x${dim}>" -quality "$q" "$candidate" >/dev/null 2>&1; then
        rm -f "$candidate"
        continue
      fi

      local size
      size=$(wc -c <"$candidate")
      if (( size < best_bytes )); then
        rm -f "$best_tmp"
        best_tmp="$candidate"
        best_bytes="$size"
      else
        rm -f "$candidate"
      fi

      if (( best_bytes <= TARGET_BYTES )); then
        break 2
      fi
    done
  done

  if [[ -z "$best_tmp" ]]; then
    echo -e "${old_url}\t\t${old_bytes}\t0\tconversion-failed" >> "$MAP_TSV"
    failed=$((failed + 1))
    return 0
  fi

  mv "$best_tmp" "$webp_path"
  converted=$((converted + 1))
  status="converted"
  if (( best_bytes > TARGET_BYTES )); then
    status="converted-over-target"
  fi
  echo -e "${old_url}\t${new_url}\t${old_bytes}\t${best_bytes}\t${status}" >> "$MAP_TSV"
}

while IFS= read -r old_url; do
  [[ -z "$old_url" ]] && continue
  convert_one "$old_url"
done < "$SQL_URLS"

{
  echo "mode=$([[ "$DRY_RUN" == "true" ]] && echo dry-run || echo apply)"
  echo "converted=$converted"
  echo "existing_webp=$already_webp_exists"
  echo "missing=$missing"
  echo "failed=$failed"
  echo "mapping_file=$MAP_TSV"
  echo "sql_file=$SQL_FILE"
} > "$REPORT_FILE"

cat > "$SQL_FILE" <<'SQL'
BEGIN;
CREATE TEMP TABLE webp_map (
  old_url text primary key,
  new_url text not null
);
\copy webp_map (old_url, new_url) from '__MAP_CSV_PATH__' with (format csv, header true);

UPDATE products p
SET image_url = m.new_url
FROM webp_map m
WHERE p.image_url = m.old_url;

UPDATE product_colorway_images c
SET image_url = m.new_url
FROM webp_map m
WHERE c.image_url = m.old_url;

UPDATE brands b
SET logo_url = m.new_url
FROM webp_map m
WHERE b.logo_url = m.old_url;

UPDATE app_settings s
SET setting_value = m.new_url,
    updated_at = now()
FROM webp_map m
WHERE s.setting_key IN ('SITE_LOGO_URL', 'SITE_LOGO_DARK_URL')
  AND s.setting_value = m.old_url;

COMMIT;
SQL

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[webp-migrate] dry-run complete"
  echo "[webp-migrate] report: $REPORT_FILE"
  echo "[webp-migrate] mapping: $MAP_TSV"
  exit 0
fi

echo "[webp-migrate] applying DB URL updates..."
MAP_ONLY="$WORK_DIR/url_mapping_apply.csv"
awk -F $'\t' 'BEGIN {print "old_url,new_url"} NR>1 && ($2 != "" && $5 ~ /^(converted|converted-over-target|existing-webp)$/) {print $1","$2}' "$MAP_TSV" > "$MAP_ONLY"

ESCAPED_MAP_PATH=$(printf '%s' "$MAP_ONLY" | sed "s/'/''/g")
SQL_READY="$WORK_DIR/apply_url_updates.ready.sql"
sed "s|__MAP_CSV_PATH__|$ESCAPED_MAP_PATH|g" "$SQL_FILE" > "$SQL_READY"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SQL_READY" >/dev/null

echo "[webp-migrate] apply complete"
echo "[webp-migrate] report: $REPORT_FILE"
echo "[webp-migrate] mapping: $MAP_TSV"
echo "[webp-migrate] backup: $BACKUP_DIR"

