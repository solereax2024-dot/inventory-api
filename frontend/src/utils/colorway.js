export function sanitizeColorways(colorways) {
  const unique = [...new Set((colorways || []).filter(Boolean))];
  if (unique.length > 1) {
    return unique.filter((value) => value.toUpperCase() !== "DEFAULT");
  }
  return unique;
}

export function colorwayPriority(colorway) {
  const value = (colorway || "").toUpperCase();
  if (value.includes("TRIPLE BLACK") || value.includes("BLACK")) {
    return 0;
  }
  if (value.includes("WHITE")) {
    return 1;
  }
  return 2;
}

export function normalizeColorwayValue(value) {
  const normalized = (value || "").trim().toUpperCase();
  return normalized || "DEFAULT";
}

export function sortColorways(colorways) {
  return [...(colorways || [])]
    .filter(Boolean)
    .sort((a, b) => {
      const normalizedA = normalizeColorwayValue(a);
      const normalizedB = normalizeColorwayValue(b);
      const priorityDiff = colorwayPriority(normalizedA) - colorwayPriority(normalizedB);
      return priorityDiff !== 0 ? priorityDiff : normalizedA.localeCompare(normalizedB);
    });
}

export function getColorwayImageUrl(product, colorway) {
  if (!product) return null;

  const normalizedColorway = normalizeColorwayValue(colorway);
  const colorwayImages = product?.colorwayImages || {};

  // Try the exact colorway first
  if (colorwayImages[normalizedColorway]) {
    return colorwayImages[normalizedColorway];
  }


  // Fall back to main product imageUrl (if it's a real URL, not a placeholder)
  if (product?.imageUrl && !product.imageUrl.includes("via.placeholder")) {
    return product.imageUrl;
  }

  console.log("[IMAGE] No image found for", product?.name, normalizedColorway, "colorwayImages:", colorwayImages);
  return null;
}

export function getColorwayDetails(product, colorway) {
  if (!product) {
    return {
      description: "",
      department: "",
      category: "",
      productType: "",
      price: null,
      minPrice: null,
      maxPrice: null
    };
  }

  const normalizedColorway = normalizeColorwayValue(colorway);
  const colorwayDetails = product?.colorwayDetails || {};
  const matched = colorwayDetails[normalizedColorway] || colorwayDetails.DEFAULT || {};

  return {
    description: matched.description || product.description || "",
    department: matched.department || product.department || "",
    category: matched.category || product.category || "",
    productType: matched.productType || product.productType || "",
    price: matched.price ?? product.price ?? null,
    minPrice: matched.minPrice ?? matched.price ?? product.price ?? null,
    maxPrice: matched.maxPrice ?? matched.price ?? product.price ?? null
  };
}

