import { formatColorwayLabel } from "./format";
import { colorwayPriority, sanitizeColorways } from "./colorway";
import { US_SIZES } from "../constants";

export function normalizeStockSizeGroup(value) {
  if (value === "WOMEN") return "WOMEN";
  if (value === "MEN") return "MEN";
  return "STANDARD";
}

export function getStockStorageGroup(department, requestedSizeGroup) {
  return String(department || "").toUpperCase() === "UNISEX"
    ? (requestedSizeGroup === "WOMEN" ? "WOMEN" : "MEN")
    : "STANDARD";
}

export function buildColorwayStockLine(stocks, selectedColorway) {
  const selectedStocks = (stocks || [])
    .filter((stock) => stock.colorway === selectedColorway)
    .sort((a, b) => Number(a.size) - Number(b.size));
  const parts = selectedStocks.map((stock) => `US${stock.size}: ${stock.quantity}`);
  return parts.join(", ");
}

export function groupStocksByColorway(stocks) {
  const grouped = new Map();
  (stocks || []).forEach((stock) => {
    const key = stock.colorway || "DEFAULT";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(stock);
  });
  return [...grouped.entries()]
    .sort(([a], [b]) => {
      const p = colorwayPriority(a) - colorwayPriority(b);
      return p !== 0 ? p : a.localeCompare(b);
    })
    .map(([colorway, items]) => {
      const sortedSizes = [...items].sort((a, b) => Number(a.size) - Number(b.size));
      const parts = sortedSizes.map((stock) => `US${stock.size}: ${stock.quantity}`);
      return `${formatColorwayLabel(colorway)} ${parts.join(", ")}`;
    });
}

export function getSortedColorwaysFromStocks(stocks) {
  const colorways = sanitizeColorways((stocks || []).map((stock) => stock.colorway));
  return colorways.sort((a, b) => {
    const p = colorwayPriority(a) - colorwayPriority(b);
    return p !== 0 ? p : a.localeCompare(b);
  });
}

export function buildStateValuesLine(stockStates, selectedColorway) {
  const stateValues = stockStates?.[selectedColorway] || {};
  const onHand = Number(stateValues.ON_HAND || 0);
  const inTransit = Number(stateValues.IN_TRANSIT || 0);
  const preOrder = Number(stateValues.PRE_ORDER || 0);
  return `On-hand: ${onHand}, In-transit: ${inTransit}, Pre-order: ${preOrder}`;
}

export function buildSizeStateRows(product, selectedColorway, requestedSizeGroup = null, department = "", sizeValues = US_SIZES) {
  const storageGroup = requestedSizeGroup ? getStockStorageGroup(department, requestedSizeGroup) : null;
  const stocks = (product?.stocks || []).filter((stock) => {
    if (stock.colorway !== selectedColorway) {
      return false;
    }
    return !storageGroup || normalizeStockSizeGroup(stock.sizeGroup) === storageGroup;
  });
  const quantityBySize = new Map();
  stocks.forEach((stock) => {
    const key = String(stock.size);
    quantityBySize.set(key, Number(quantityBySize.get(key) || 0) + Number(stock.quantity || 0));
  });
  const bySize = storageGroup
    ? product?.stockStateBySizeGroup?.[selectedColorway]?.[storageGroup] || {}
    : product?.stockStateBySize?.[selectedColorway] || {};
  const sizeList = (Array.isArray(sizeValues) && sizeValues.length > 0 ? sizeValues : US_SIZES)
    .map((size) => String(size).trim())
    .filter(Boolean);
  return [...new Set(sizeList)].map((size) => {
    const stateValues = bySize?.[size] || {};
    const onHand = Number(stateValues.ON_HAND || 0);
    const inTransit = Number(stateValues.IN_TRANSIT || 0);
    const preOrder = Number(stateValues.PRE_ORDER || 0);
    const total = Number(quantityBySize.get(size) || 0);
    return { size, onHand, inTransit, preOrder, total };
  });
}
