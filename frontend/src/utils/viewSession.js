const VIEW_SESSION_KEY = "solereax-view-session-id";
const TRACKED_SCOPE_PREFIX = "solereax-view-tracked:";

function generateSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateViewSessionId() {
  try {
    const existing = localStorage.getItem(VIEW_SESSION_KEY);
    if (existing) {
      return existing;
    }
    const created = generateSessionId();
    localStorage.setItem(VIEW_SESSION_KEY, created);
    return created;
  } catch {
    return generateSessionId();
  }
}

export function shouldTrackViewForScope(scope) {
  const normalizedScope = (scope || "").trim();
  if (!normalizedScope) {
    return true;
  }

  try {
    const key = `${TRACKED_SCOPE_PREFIX}${normalizedScope}`;
    if (sessionStorage.getItem(key)) {
      return false;
    }
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

