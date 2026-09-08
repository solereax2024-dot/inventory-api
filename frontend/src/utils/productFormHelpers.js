import { getColorwayDetails, sanitizeColorways, normalizeColorwayValue } from "./colorway";

export function getProductColorways(product) {
  const values = sanitizeColorways([
    ...((product?.stocks || []).map((stock) => stock.colorway)),
    ...Object.keys(product?.colorwayImages || {}),
    ...Object.keys(product?.colorwayDetails || {}),
    product?.mainColor
  ]).map(normalizeColorwayValue);

  return values.length > 0 ? [...new Set(values)] : ["DEFAULT"];
}

export function getAdminScopedColorway(product, explicitColorway) {
  const available = getProductColorways(product);
  const preferred = normalizeColorwayValue(
    explicitColorway || product?.mainColor || available[0] || "DEFAULT"
  );

  return available.includes(preferred) ? preferred : available[0] || "DEFAULT";
}

export function getAdminScopedDetails(product, explicitColorway) {
  return getColorwayDetails(product, getAdminScopedColorway(product, explicitColorway));
}

export function mapProductToForm(product, colorway) {
  const details = getAdminScopedDetails(product, colorway);

  return {
    name: product?.name || "",
    brand: product?.brand || "",
    mainColor: product?.mainColor || "",
    department: details.department || "UNISEX",
    category: details.category || "FOOTWEAR",
    productType: details.productType || "LIFESTYLE_SNEAKERS",
    imageUrl: product?.imageUrl || "",
    price: product?.price === null || product?.price === undefined ? "" : String(product.price),
    colorwayPrice: details?.price === null || details?.price === undefined ? "" : String(details.price),
    colorwayImages: product?.colorwayImages || {},
    description: details.description || ""
  };
}

