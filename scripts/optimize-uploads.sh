#!/usr/bin/env bash
set -euo pipefail

UPLOAD_DIR="${UPLOAD_DIR:-uploads}"
TARGET_KB="${TARGET_KB:-120}"
MIN_SOURCE_KB="${MIN_SOURCE_KB:-200}"
MAX_DIMENSION="${MAX_DIMENSION:-1600}"
DRY_RUN="false"
BACKUP_DIR=""
IM_CMD=""

usage() {
  cat <<'EOF'
Batch-optimize uploaded product images in-place while keeping existing file paths.

Usage:
  ./scripts/optimize-uploads.sh [options]

Options:
  --dir <path>            Uploads directory (default: uploads)
  --target-kb <number>    Target max file size in KB (default: 120)
  --min-kb <number>       Only optimize files larger than this KB (default: 200)
  --max-dim <number>      Max width/height constraint (default: 1600)
  --backup-dir <path>     Backup folder for overwritten originals
  --dry-run               Print actions without modifying files
  --help                  Show this help

Examples:
  ./scripts/optimize-uploads.sh --target-kb 120 --min-kb 150
  ./scripts/optimize-uploads.sh --target-kb 30 --max-dim 900
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      UPLOAD_DIR="$2"
      shift 2
      ;;
    --target-kb)
      TARGET_KB="$2"
      shift 2
      ;;
    --min-kb)
      MIN_SOURCE_KB="$2"
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
    --dry-run)
      DRY_RUN="true"
      shift
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

if [[ ! "$TARGET_KB" =~ ^[0-9]+$ ]] || [[ ! "$MIN_SOURCE_KB" =~ ^[0-9]+$ ]] || [[ ! "$MAX_DIMENSION" =~ ^[0-9]+$ ]]; then
  echo "target-kb, min-kb, and max-dim must be integers" >&2
  exit 1
fi

if [[ ! -d "$UPLOAD_DIR" ]]; then
  echo "Uploads directory not found: $UPLOAD_DIR" >&2
  exit 1
fi

if [[ "$DRY_RUN" != "true" ]]; then
  if command -v magick >/dev/null 2>&1; then
    IM_CMD="magick"
  elif command -v convert >/dev/null 2>&1; then
    IM_CMD="convert"
  else
    echo "ImageMagick is required. Install first (apt: imagemagick)." >&2
    exit 1
  fi
fi

TARGET_BYTES=$((TARGET_KB * 1024))
MIN_SOURCE_BYTES=$((MIN_SOURCE_KB * 1024))

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="${UPLOAD_DIR%/}-backup-$(date +%Y%m%d-%H%M%S)"
fi

declare -a QUALITIES=(82 74 66 58 50 42)
declare -a SCALES=(100 92 84 76 68 60 52 44)

processed=0
changed=0
skipped=0
failed=0
bytes_saved=0

optimize_file() {
  local file="$1"
  local original_size
  original_size=$(wc -c <"$file")

  if (( original_size < MIN_SOURCE_BYTES )); then
    skipped=$((skipped + 1))
    return 0
  fi

  processed=$((processed + 1))

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] would optimize: $file ($(numfmt --to=iec --suffix=B "$original_size" 2>/dev/null || echo "${original_size}B"))"
    return 0
  fi

  local ext base_dim
  ext="${file##*.}"
  ext="${ext,,}"
  if [[ "$ext" != "jpg" && "$ext" != "jpeg" && "$ext" != "png" && "$ext" != "webp" ]]; then
    skipped=$((skipped + 1))
    return 0
  fi

  local best_tmp=""
  local best_size="$original_size"

  for scale in "${SCALES[@]}"; do
    local dim=$((MAX_DIMENSION * scale / 100))
    (( dim < 320 )) && dim=320

    for q in "${QUALITIES[@]}"; do
      local candidate
      candidate=$(mktemp "/tmp/opt-img-XXXXXX.$ext")

      if ! "$IM_CMD" "$file" -auto-orient -strip -resize "${dim}x${dim}>" -quality "$q" "$candidate" >/dev/null 2>&1; then
        rm -f "$candidate"
        continue
      fi

      local candidate_size
      candidate_size=$(wc -c <"$candidate")

      if (( candidate_size < best_size )); then
        rm -f "$best_tmp"
        best_tmp="$candidate"
        best_size="$candidate_size"
      else
        rm -f "$candidate"
      fi

      if (( best_size <= TARGET_BYTES )); then
        break 2
      fi
    done
  done

  if [[ -z "$best_tmp" ]] || (( best_size >= original_size )); then
    rm -f "$best_tmp"
    skipped=$((skipped + 1))
    return 0
  fi

  mkdir -p "$BACKUP_DIR"
  local backup_path="$BACKUP_DIR/${file#$UPLOAD_DIR/}"
  mkdir -p "$(dirname "$backup_path")"
  cp -p "$file" "$backup_path"

  mv "$best_tmp" "$file"
  changed=$((changed + 1))
  bytes_saved=$((bytes_saved + (original_size - best_size)))

  local before_kb after_kb
  before_kb=$((original_size / 1024))
  after_kb=$((best_size / 1024))
  echo "optimized: $file (${before_kb}KB -> ${after_kb}KB)"
}

while IFS= read -r -d '' file; do
  if ! optimize_file "$file"; then
    failed=$((failed + 1))
    echo "failed: $file" >&2
  fi
done < <(find "$UPLOAD_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) -print0)

echo
echo "Done."
echo "  processed : $processed"
echo "  changed   : $changed"
echo "  skipped   : $skipped"
echo "  failed    : $failed"
echo "  saved KB  : $((bytes_saved / 1024))"
if [[ "$DRY_RUN" != "true" && "$changed" -gt 0 ]]; then
  echo "  backup dir: $BACKUP_DIR"
fi

