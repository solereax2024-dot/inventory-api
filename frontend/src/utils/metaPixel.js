function getFbq() {
  if (typeof window === "undefined") {
    return null;
  }
  return typeof window.fbq === "function" ? window.fbq : null;
}

export function trackMetaEvent(eventName, params = {}) {
  const fbq = getFbq();
  if (!fbq) {
    return false;
  }
  fbq("track", eventName, params);
  return true;
}

export function trackMetaCustomEvent(eventName, params = {}) {
  const fbq = getFbq();
  if (!fbq) {
    return false;
  }
  fbq("trackCustom", eventName, params);
  return true;
}

