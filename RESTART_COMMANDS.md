# Restart Commands for the Tetris Frontend

These are the commands I used to restart the frontend and verify that it is live on `8080`.

## 1) Stop any existing server on port 8080

```bash
lsof -ti tcp:8080 | xargs kill -9
```

If nothing is running on `8080`, this may print nothing. You can also wrap it safely like this:

```bash
if lsof -ti tcp:8080 >/dev/null 2>&1; then
  lsof -ti tcp:8080 | xargs kill -9
fi
```

## 2) Start the frontend dev server

```bash
cd /Users/Domingo/Documents/inventory-api/frontend
npm run dev -- --host 0.0.0.0
```

## 3) Verify that `8080` is responding

```bash
curl -I http://127.0.0.1:8080 | cat
```

## 4) Optional: rebuild before restarting

If you want to make sure the latest production build is also updated:

```bash
cd /Users/Domingo/Documents/inventory-api/frontend
npm run build
npm run dev -- --host 0.0.0.0
```

## 5) Browser refresh

Open:

```text
http://localhost:8080
```

Then do a hard refresh:

- macOS: `Cmd + Shift + R`

## Notes

- The current setup uses Vite on port `8080`.
- If the page looks stale, stop the server, start it again, and hard refresh the browser.

