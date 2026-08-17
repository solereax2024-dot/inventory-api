import { formatColorwayLabel } from "./format";
import { colorwayPriority, sanitizeColorways } from "./colorway";
import { US_SIZES } from "../constants";

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

export function buildSizeStateRows(product, selectedColorway) {
  const stocks = (product?.stocks || []).filter((stock) => stock.colorway === selectedColorway);
  const quantityBySize = new Map();
  stocks.forEach((stock) => {
    quantityBySize.set(String(stock.size), Number(stock.quantity || 0));
  });
  const bySize = product?.stockStateBySize?.[selectedColorway] || {};
  return US_SIZES.map((size) => {
    const stateValues = bySize?.[size] || {};
    const onHand = Number(stateValues.ON_HAND || 0);
    const inTransit = Number(stateValues.IN_TRANSIT || 0);
    const preOrder = Number(stateValues.PRE_ORDER || 0);
    const total = Number(quantityBySize.get(size) || 0);
    return { size, onHand, inTransit, preOrder, total };
  });
}
