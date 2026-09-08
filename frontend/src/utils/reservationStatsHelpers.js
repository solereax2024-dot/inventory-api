import { RESERVATION_MOP_OPTIONS } from "../constants";
import { formatEnumLabel } from "./format";
import { normalizeReservationStatus } from "./adminHelpers";
import { buildSizeStateRows, getSortedColorwaysFromStocks } from "./stock";

export function buildReservationStats(orders, products) {
  const totalReservations = orders.length;
  const preparingCount = orders.filter((order) => normalizeReservationStatus(order.status) === "PREPARING").length;
  const shippedCount = orders.filter((order) => normalizeReservationStatus(order.status) === "SHIPPED").length;
  const paidCount = orders.filter((order) => normalizeReservationStatus(order.status) === "PAID").length;

  const totalSalesAll = orders.reduce((sum, order) => {
    const parsed = Number(order.totalPrice);
    return Number.isFinite(parsed) && parsed >= 0 ? sum + parsed : sum;
  }, 0);

  const totalSalesPaid = orders.reduce((sum, order) => {
    if (normalizeReservationStatus(order.status) !== "PAID") {
      return sum;
    }
    const parsed = Number(order.totalPrice);
    return Number.isFinite(parsed) && parsed >= 0 ? sum + parsed : sum;
  }, 0);

  const activeProducts = products.length;
  const lowStockSizes = products.reduce((count, product) => {
    const colorways = getSortedColorwaysFromStocks(product.stocks);
    return count + colorways.reduce((nestedCount, colorway) => (
      nestedCount + buildSizeStateRows(product, colorway).filter((row) => row.total > 0 && row.total <= 3).length
    ), 0);
  }, 0);

  return {
    totalReservations,
    preparingCount,
    shippedCount,
    paidCount,
    totalSalesAll,
    totalSalesPaid,
    activeProducts,
    lowStockSizes
  };
}

export function buildFilteredReservations(orders, reservationFilters) {
  const keyword = reservationFilters.keyword.trim().toLowerCase();
  const statusFilter = reservationFilters.status;

  return [...orders]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .filter((order) => {
      const normalizedStatus = normalizeReservationStatus(order.status);
      if (statusFilter !== "ALL" && normalizedStatus !== statusFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }

      const itemText = (order.items || []).map((item) => (
        `${item.productName || ""} ${item.colorway || ""} ${item.size || ""} ${item.sizeGroup || ""}`
      )).join(" ").toLowerCase();
      const haystack = [
        String(order.id || ""),
        order.customerName || "",
        order.customerContact || "",
        order.notes || "",
        order.status || "",
        itemText
      ].join(" ").toLowerCase();

      return haystack.includes(keyword);
    });
}

export function buildReservationMopTotals(filteredReservations) {
  const totals = new Map();
  const otherLabels = new Map();

  filteredReservations.forEach((order) => {
    const rawMop = String(order.mop || "").trim().toUpperCase();
    let key = rawMop || "NO_MOP";

    if (rawMop === "OTHER") {
      const rawOther = String(order.mopOther || "").trim();
      const normalizedOther = rawOther.toUpperCase() || "UNSPECIFIED";
      key = `OTHER:${normalizedOther}`;
      if (!otherLabels.has(key)) {
        otherLabels.set(key, rawOther || "Other (Unspecified)");
      }
    }

    const parsed = Number(order.totalPrice);
    const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    totals.set(key, (totals.get(key) || 0) + amount);
  });

  const standardKeys = RESERVATION_MOP_OPTIONS
    .map((option) => option.value)
    .filter((value) => value !== "OTHER");
  const otherKeys = [...totals.keys()].filter((key) => key.startsWith("OTHER:")).sort();
  const orderedKeys = [
    ...standardKeys,
    ...otherKeys,
    "NO_MOP"
  ];

  return orderedKeys
    .filter((key) => totals.has(key))
    .map((key) => ({
      key,
      label: key === "NO_MOP"
        ? "No MOP"
        : (key.startsWith("OTHER:")
          ? otherLabels.get(key)
          : (RESERVATION_MOP_OPTIONS.find((option) => option.value === key)?.label || formatEnumLabel(key))),
      total: totals.get(key) || 0
    }));
}

