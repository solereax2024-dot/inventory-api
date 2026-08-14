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

export function getProductTypeOptions(category) {
  return PRODUCT_TYPE_OPTIONS[category] || [];
}
