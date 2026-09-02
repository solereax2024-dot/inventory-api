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

export function buildSizeStateRows(product, selectedColorway, requestedSizeGroup = null, department = "", sizeValues = US_SIZES) {
  const storageGroup = requestedSizeGroup ? getStockStorageGroup(department, requestedSizeGroup) : null;
  const stocks = (product?.stocks || []).filter((stock) => {
    if (stock.colorway !== selectedColorway) {
      return false;
    }
    return !storageGroup || normalizeStockSizeGroup(stock.sizeGroup) === storageGroup;
  });
  const quantityBySize = new Map();
  const priceBySize = new Map();
  const markupBySize = new Map();
  const supplierBySize = new Map();
  const supplierEntriesBySize = new Map();
  stocks.forEach((stock) => {
    const key = String(stock.size);
    const quantity = Number(stock.quantity || 0);
    const supplier = String(stock.supplier || "").trim();
    quantityBySize.set(key, Number(quantityBySize.get(key) || 0) + Number(stock.quantity || 0));
    const parsedPrice = Number(stock.price);
    const parsedMarkup = Number(stock.markup);
    if (!priceBySize.has(key) && Number.isFinite(parsedPrice) && parsedPrice >= 0) {
      priceBySize.set(key, parsedPrice);
    }
    if (!markupBySize.has(key) && Number.isFinite(parsedMarkup) && parsedMarkup >= 0) {
      markupBySize.set(key, parsedMarkup);
    }
    if (!supplierBySize.has(key) && supplier) {
      supplierBySize.set(key, supplier);
    }

    if (supplier || quantity > 0) {
      if (!supplierEntriesBySize.has(key)) {
        supplierEntriesBySize.set(key, new Map());
      }
      const entries = supplierEntriesBySize.get(key);
      const entryKey = supplier || "__NO_SUPPLIER__";
      const existing = entries.get(entryKey) || {
        supplier,
        quantity: 0,
        price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null,
        markup: Number.isFinite(parsedMarkup) && parsedMarkup >= 0 ? parsedMarkup : null
      };
      existing.quantity += quantity;
      if (existing.price === null && Number.isFinite(parsedPrice) && parsedPrice >= 0) {
        existing.price = parsedPrice;
      }
      if (existing.markup === null && Number.isFinite(parsedMarkup) && parsedMarkup >= 0) {
        existing.markup = parsedMarkup;
      }
      entries.set(entryKey, existing);
    }
  });
  const sizeList = (Array.isArray(sizeValues) && sizeValues.length > 0 ? sizeValues : US_SIZES)
    .map((size) => String(size).trim())
    .filter(Boolean);
  return [...new Set(sizeList)].map((size) => {
    const total = Number(quantityBySize.get(size) || 0);
    const supplierEntries = [...(supplierEntriesBySize.get(size)?.values() || [])]
      .sort((a, b) => {
        if (!a.supplier && b.supplier) return 1;
        if (a.supplier && !b.supplier) return -1;
        return String(a.supplier || "").localeCompare(String(b.supplier || ""));
      });
    return {
      size,
      onHand: total,
      inTransit: 0,
      preOrder: 0,
      total,
      price: priceBySize.get(size) ?? null,
      markup: markupBySize.get(size) ?? null,
      supplier: supplierBySize.get(size) || supplierEntries[0]?.supplier || "",
      supplierEntries
    };
  });
}
