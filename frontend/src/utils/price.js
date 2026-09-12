export const PHP_CURRENCY = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

export const CUSTOMER_MARKUP = 2000;

export function toCustomerPriceFromSupplier(supplierPrice, markup = CUSTOMER_MARKUP) {
  const supplier = Number(supplierPrice);
  const markupValue = Number(markup);
  if (!Number.isFinite(supplier) || supplier < 0 || !Number.isFinite(markupValue) || markupValue < 0) {
    return null;
  }
  return Number((supplier + markupValue).toFixed(2));
}

export function formatPriceDisplay(minPrice, maxPrice, options = {}) {
  const { minimumOnly = false } = options || {};
  const min = Number(minPrice);
  const max = Number(maxPrice);
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;

  if (!hasMin && !hasMax) {
    return "";
  }

  if (hasMin && hasMax) {
    if (minimumOnly) {
      return PHP_CURRENCY.format(Math.min(min, max));
    }
    if (Math.abs(min - max) < 0.01) {
      return PHP_CURRENCY.format(min);
    }
    return `${PHP_CURRENCY.format(Math.min(min, max))} - ${PHP_CURRENCY.format(Math.max(min, max))}`;
  }

  return PHP_CURRENCY.format(hasMin ? min : max);
}

export function applyPromotionPreviewPrice(rawPrice, promotion) {
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0 || !promotion) {
    return null;
  }
  const discountValue = Number(promotion.discountValue || 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return price;
  }
  if (promotion.discountType === "PERCENT") {
    return Math.max(0, Number((price * (1 - (discountValue / 100))).toFixed(2)));
  }
  return Math.max(0, Number((price - discountValue).toFixed(2)));
}

export function formatMaskedPriceValue(rawPrice) {
  const price = Math.max(0, Math.floor(Number(rawPrice)));
  if (!Number.isFinite(price) || price <= 0) {
    return "";
  }
  const digits = String(price);
  const maskedDigits = digits.length <= 2 ? 1 : Math.min(3, digits.length - 1);
  const visibleDigits = Math.max(1, digits.length - maskedDigits);
  return `₱${digits.slice(0, visibleDigits)}${"?".repeat(maskedDigits)}`;
}

export function formatMaskedPriceDisplay(minPrice, maxPrice) {
  const minLabel = formatMaskedPriceValue(minPrice);
  const maxLabel = formatMaskedPriceValue(maxPrice);
  if (!minLabel && !maxLabel) {
    return "";
  }
  if (minLabel && maxLabel) {
    return minLabel === maxLabel ? minLabel : `${minLabel} - ${maxLabel}`;
  }
  return minLabel || maxLabel;
}

