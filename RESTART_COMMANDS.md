# Restart Commands for the Sole Reax Application

Everything now runs on port **8080** only.

## Prerequisites: Start Docker & Database

### 1) Start the PostgreSQL database with Docker Compose

```bash
cd /Users/Domingo/Documents/inventory-api
docker-compose up -d
```

Verify the database is running:

```bash
docker ps | grep sole-reax-postgres
```

Wait for the container to be fully ready (~10-15 seconds).

---

## Option A: Production Setup (Single Port 8080)

Use this when you want everything bundled on port 8080.

### Build and run backend only (backend serves both API + frontend)

```bash
cd /Users/Domingo/Documents/inventory-api

# Build frontend first
cd frontend
npm run build
cd ..

# Then run backend (it serves the static frontend)
./mvnw clean install -DskipTests
./mvnw spring-boot:run
```

Everything is now available at `http://localhost:8080`

---

## Option B: Development Setup (Frontend Dev Server + Separate Backend)

Use this when developing frontend and you want hot-reload.

### Terminal 1: Backend on port 8081

```bash
cd /Users/Domingo/Documents/inventory-api
SERVER_PORT=8081 ./mvnw spring-boot:run
```

### Terminal 2: Frontend dev server on port 8080

```bash
cd /Users/Domingo/Documents/inventory-api/frontend
npm run dev -- --host 0.0.0.0
```

Frontend is at `http://localhost:8080` and proxies API calls to backend on 8081.

**Note:** For this to work, update `vite.config.js` to point proxy to `http://localhost:8081` instead of 8080.

---

## Verify Setup

### Production (Option A)
```bash
curl -I http://127.0.0.1:8080
# Should return HTML frontend
```

### Development (Option B)
```bash
# Frontend
curl -I http://127.0.0.1:8080

# Backend API
curl -I http://127.0.0.1:8081/api/public/brands
```

---

## Browser Access

- **Frontend:** `http://localhost:8080`
- Hard refresh: `Cmd + Shift + R` (macOS) or `Ctrl + Shift + R` (Windows/Linux)

---

## Cleanup: Stop Everything

```bash
# Stop frontend/backend (in their terminals: Ctrl+C)

# Stop Docker
cd /Users/Domingo/Documents/inventory-api
docker-compose down

# Optional: Reset database
docker volume rm sole-reax-db
docker-compose up -d
```

---

## Common Issues

### Port 5432 already in use (PostgreSQL)
```bash
# Stop existing PostgreSQL
brew services stop postgresql

# Or use different port in docker-compose.yml
```

### Port 8080 already in use
```bash
lsof -ti tcp:8080 | xargs kill -9
```

### Port 8081 already in use (dev backend)
```bash
lsof -ti tcp:8081 | xargs kill -9
# Or use different port: PORT=8082 ./mvnw spring-boot:run
```

### Tests fail with "connection refused"
```bash
# Make sure Docker is running
docker-compose up -d

# Then run tests
./mvnw test
```

### Frontend sees old API responses
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

---

## Development Workflow

**Recommended for daily development:**

1. Start Docker: `docker-compose up -d`
2. Start backend on 8081: `SERVER_PORT=8081 ./mvnw spring-boot:run`
3. Start frontend on 8080: `cd frontend && npm run dev -- --host 0.0.0.0`
4. Open `http://localhost:8080` in browser

For frontend-only changes, just edit and refresh—Vite hot-reloads.
For backend changes, restart the Maven process.

**For production deployment:**

1. Start Docker
2. Build everything: `./mvnw clean install`
3. Run: `./mvnw spring-boot:run` (defaults to 8080)
4. Open `http://localhost:8080`

