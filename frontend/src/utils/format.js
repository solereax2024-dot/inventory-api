import { PRODUCT_TYPE_OPTIONS } from "../constants";

export function formatColorwayLabel(colorway) {
  return (colorway || "")
    .split("/")
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .join("/");
}

export function formatEnumLabel(value) {
  return (value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSaleStartLabel(startsAt) {
  if (!startsAt) {
    return "Coming soon";
  }
  const value = new Date(startsAt);
  if (Number.isNaN(value.getTime())) {
    return "Coming soon";
  }
  return `Starts ${value.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export function formatCountdownLabel(remainingMs) {
  const totalMs = Number(remainingMs);
  if (!Number.isFinite(totalMs) || totalMs <= 0) {
    return "Live now";
  }
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function getProductTypeOptions(category) {
  return PRODUCT_TYPE_OPTIONS[category] || [];
}
