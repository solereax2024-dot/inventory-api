import { PHP_CURRENCY } from "./price";

export function normalizeReservationStatus(status) {
  return status === "RESERVED" ? "ORDERED" : status;
}

export function statusChipClass(status) {
  const normalized = normalizeReservationStatus(status);
  if (normalized === "PAID") return "status-paid";
  if (normalized === "DELIVERED") return "status-delivered";
  if (normalized === "SHIPPED") return "status-shipped";
  if (normalized === "PREPARING") return "status-preparing";
  return "status-ordered";
}

export function formatReservationDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function decodeRoleFromToken(token) {
  if (!token) {
    return "";
  }
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return "";
    }
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(window.atob(base64));
    return typeof json.role === "string" ? json.role : "";
  } catch {
    return "";
  }
}

export function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFileFormatLabel(file) {
  if (!file) return "";
  const byType = (file.type || "").split("/")[1];
  if (byType) return byType.toUpperCase();
  const name = String(file.name || "");
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return ext ? ext.toUpperCase() : "UNKNOWN";
}

export function formatPriceLabel(value) {
  if (value === null || value === undefined || value === "") {
    return PHP_CURRENCY.format(0);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return PHP_CURRENCY.format(0);
  }
  return PHP_CURRENCY.format(parsed);
}

