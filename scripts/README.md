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
```

