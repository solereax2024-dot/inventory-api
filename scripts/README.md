# Deployment Scripts

## `deploy-prod.sh`

Deploys the latest `origin/main` to production over SSH using key-based auth.

### Prerequisites

- SSH host alias `prod-inventory` must work without password.
- Remote app directory exists at `/home/inventory-api`.

### Usage

```bash
./scripts/deploy-prod.sh
```

### Optional overrides

```bash
DEPLOY_HOST=prod-inventory ./scripts/deploy-prod.sh
DEPLOY_APP_DIR=/home/inventory-api ./scripts/deploy-prod.sh
DEPLOY_CHECK_URL=http://127.0.0.1:8080/api/public/products/7 ./scripts/deploy-prod.sh
DEPLOY_SERVICE_NAME=inventory-api.service ./scripts/deploy-prod.sh
DEPLOY_CHECK_RETRIES=40 DEPLOY_CHECK_INTERVAL_SECONDS=5 ./scripts/deploy-prod.sh
```

## `optimize-uploads.sh`

Optimizes existing uploaded images in-place while keeping the same file paths, so DB URLs remain valid.

### Prerequisites

- Run from repo root.
- ImageMagick (`magick`) installed on the machine where script runs.

### Usage

```bash
./scripts/optimize-uploads.sh --target-kb 120 --min-kb 150
./scripts/optimize-uploads.sh --target-kb 30 --max-dim 900
./scripts/optimize-uploads.sh --dry-run
```

### Notes

- Script creates a backup folder before replacing originals.
- `30KB` target is best-effort; some images may need aggressive downscale to reach it.

## `migrate-image-urls-to-webp.sh`

Converts DB-referenced `/uploads/*.png|jpg|jpeg` images to `.webp` and updates DB URL fields while preserving rollback artifacts.

### Usage

```bash
./scripts/migrate-image-urls-to-webp.sh
./scripts/migrate-image-urls-to-webp.sh --apply --target-kb 35 --max-dim 900
```

### What it updates

- `products.image_url`
- `product_colorway_images.image_url`
- `brands.logo_url`
- `app_settings.setting_value` for `SITE_LOGO_URL` and `SITE_LOGO_DARK_URL`

### Safety

- Default mode is dry-run.
- Original files are backed up before conversion.
- Mapping and SQL artifacts are written to a timestamped `tmp/webp-migration-*` directory.

