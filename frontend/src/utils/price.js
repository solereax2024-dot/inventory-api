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

export function formatPriceDisplay(minPrice, maxPrice) {
  const min = Number(minPrice);
  const max = Number(maxPrice);
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;

  if (!hasMin && !hasMax) {
    return "";
  }

  if (hasMin && hasMax) {
    if (Math.abs(min - max) < 0.01) {
      return PHP_CURRENCY.format(min);
    }
    return `${PHP_CURRENCY.format(Math.min(min, max))} - ${PHP_CURRENCY.format(Math.max(min, max))}`;
  }

  return PHP_CURRENCY.format(hasMin ? min : max);
}

