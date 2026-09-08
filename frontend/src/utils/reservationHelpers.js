import { getColorwayDetails } from "./colorway";
import { normalizeReservationStatus } from "./adminHelpers";
import { formatSelectedSizeLabel, getDepartmentForColorway } from "./sizePresentation";
import { getStockStorageGroup } from "./stock";

export function resolveOriginalUnitPrice(item, productById) {
  const product = productById[String(item?.productId)];
  if (!product) {
    return null;
  }

  const department = getDepartmentForColorway(product, item?.colorway);
  const normalizedItemSizeGroup = String(item?.sizeGroup || "").toUpperCase();
  const storageSizeGroup = getStockStorageGroup(department, normalizedItemSizeGroup);
  const exactStock = (product.stocks || []).find((stock) => (
    String(stock.colorway || "").toUpperCase() === String(item.colorway || "").toUpperCase()
    && String(stock.size) === String(item.size)
    && String(stock.sizeGroup || "").toUpperCase() === storageSizeGroup
  ));
  const stockPrice = Number(exactStock?.price);
  if (Number.isFinite(stockPrice) && stockPrice >= 0) {
    return stockPrice;
  }

  const colorwayPrice = Number(getColorwayDetails(product, item.colorway)?.price);
  if (Number.isFinite(colorwayPrice) && colorwayPrice >= 0) {
    return colorwayPrice;
  }

  const productPrice = Number(product?.price);
  return Number.isFinite(productPrice) && productPrice >= 0 ? productPrice : null;
}

export function formatReservationItemSizeLabel(item, productById) {
  const normalizedSizeGroup = String(item?.sizeGroup || "").toUpperCase();
  const product = productById[String(item?.productId)];
  const department = product ? getDepartmentForColorway(product, item?.colorway) : normalizedSizeGroup;

  if (String(department || "").toUpperCase() === "UNISEX" && normalizedSizeGroup === "STANDARD") {
    return `US ${item?.size || "-"}`;
  }

  const formatted = formatSelectedSizeLabel(item?.size, normalizedSizeGroup, department);
  if (formatted) {
    return formatted;
  }
  if (normalizedSizeGroup === "WOMEN") {
    return `Women's US ${item?.size || "-"}`;
  }
  if (normalizedSizeGroup === "KIDS") {
    return `Kids' US ${item?.size || "-"}`;
  }

  return `Men's US ${item?.size || "-"}`;
}

export function buildReservationRowState(order, productById, drafts) {
  const normalizedStatus = normalizeReservationStatus(order?.status);
  const normalizedCourier = String(order?.courier || "").toUpperCase();
  const normalizedMop = String(order?.mop || "").toUpperCase();

  const mopOtherDraft = drafts.mopOtherDrafts[order.id] ?? order.mopOther ?? "";
  const trimmedMopOtherDraft = mopOtherDraft.trim();

  const hasOrderPrice = order.totalPrice !== null && order.totalPrice !== undefined && order.totalPrice !== "";
  const normalizedOrderPrice = hasOrderPrice ? Number(order.totalPrice).toFixed(2) : "";
  const originalPriceTotal = (order.items || []).reduce((sum, item) => {
    const basePrice = resolveOriginalUnitPrice(item, productById);
    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(quantity) || quantity <= 0) {
      return sum;
    }
    return sum + (basePrice * quantity);
  }, 0);
  const hasOriginalPrice = originalPriceTotal > 0;
  const hasCustomPrice = hasOrderPrice && hasOriginalPrice
    && Math.abs(Number(order.totalPrice) - originalPriceTotal) >= 0.01;

  const priceDraft = String(drafts.priceDrafts[order.id] ?? normalizedOrderPrice);
  const trimmedPriceDraft = priceDraft.trim();
  const isPriceDirty = trimmedPriceDraft !== normalizedOrderPrice;

  const hasDownpayment = order.downpayment !== null && order.downpayment !== undefined && order.downpayment !== "";
  const normalizedDownpayment = hasDownpayment ? Number(order.downpayment).toFixed(2) : "";
  const downpaymentDraft = String(drafts.downpaymentDrafts[order.id] ?? normalizedDownpayment);
  const trimmedDownpaymentDraft = downpaymentDraft.trim();
  const isDownpaymentDirty = trimmedDownpaymentDraft !== normalizedDownpayment;

  const computedBalance = hasOrderPrice
    ? Math.max(0, Number(order.totalPrice) - Number(order.downpayment || 0))
    : null;
  const hasBalance = order.balance !== null && order.balance !== undefined && order.balance !== "";
  const balanceDisplayValue = hasBalance ? Number(order.balance) : computedBalance;
  const normalizedBalance = hasBalance
    ? Number(order.balance).toFixed(2)
    : (computedBalance !== null ? Number(computedBalance).toFixed(2) : "");
  const balanceDraft = String(drafts.balanceDrafts[order.id] ?? normalizedBalance);
  const trimmedBalanceDraft = balanceDraft.trim();
  const isBalanceDirty = trimmedBalanceDraft !== normalizedBalance;

  const hasUnsavedMopOther = normalizedMop === "OTHER"
    && trimmedMopOtherDraft
    && trimmedMopOtherDraft !== (order.mopOther || "");

  return {
    normalizedStatus,
    normalizedCourier,
    normalizedMop,
    mopOtherDraft,
    trimmedMopOtherDraft,
    hasOrderPrice,
    normalizedOrderPrice,
    originalPriceTotal,
    hasOriginalPrice,
    hasCustomPrice,
    priceDraft,
    trimmedPriceDraft,
    isPriceDirty,
    hasDownpayment,
    normalizedDownpayment,
    downpaymentDraft,
    trimmedDownpaymentDraft,
    isDownpaymentDirty,
    computedBalance,
    hasBalance,
    balanceDisplayValue,
    normalizedBalance,
    balanceDraft,
    trimmedBalanceDraft,
    isBalanceDirty,
    hasUnsavedMopOther
  };
}

