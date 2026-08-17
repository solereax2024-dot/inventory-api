const BRAND_SIZE_GUIDES = {
  NIKE: {
    brandLabel: "Nike",
    sourceLabel: "Nike official size conversion chart",
    rows: [
      { usMen: "6", usWomen: "7.5", eu: "38.5", cm: "24" },
      { usMen: "6.5", usWomen: "8", eu: "39", cm: "24.5" },
      { usMen: "7", usWomen: "8.5", eu: "40", cm: "25" },
      { usMen: "7.5", usWomen: "9", eu: "40.5", cm: "25.5" },
      { usMen: "8", usWomen: "9.5", eu: "41", cm: "26" },
      { usMen: "8.5", usWomen: "10", eu: "42", cm: "26.5" },
      { usMen: "9", usWomen: "10.5", eu: "42.5", cm: "27" },
      { usMen: "9.5", usWomen: "11", eu: "43", cm: "27.5" },
      { usMen: "10", usWomen: "11.5", eu: "44", cm: "28" },
      { usMen: "10.5", usWomen: "12", eu: "44.5", cm: "28.5" },
      { usMen: "11", usWomen: "12.5", eu: "45", cm: "29" },
      { usMen: "11.5", usWomen: "13", eu: "45.5", cm: "29.5" },
      { usMen: "12", usWomen: "13.5", eu: "46", cm: "30" },
      { usMen: "12.5", usWomen: "14", eu: "47", cm: "30.5" },
      { usMen: "13", usWomen: "14.5", eu: "47.5", cm: "31" }
    ]
  },
  ADIDAS: {
    brandLabel: "Adidas",
    sourceLabel: "Adidas official size conversion chart",
    rows: [
      { usMen: "6", usWomen: "7", eu: "38.7", cm: "24" },
      { usMen: "6.5", usWomen: "7.5", eu: "39.3", cm: "24.5" },
      { usMen: "7", usWomen: "8", eu: "40", cm: "25" },
      { usMen: "7.5", usWomen: "8.5", eu: "40.7", cm: "25.5" },
      { usMen: "8", usWomen: "9", eu: "41.3", cm: "26" },
      { usMen: "8.5", usWomen: "9.5", eu: "42", cm: "26.5" },
      { usMen: "9", usWomen: "10", eu: "42.7", cm: "27" },
      { usMen: "9.5", usWomen: "10.5", eu: "43.3", cm: "27.5" },
      { usMen: "10", usWomen: "11", eu: "44", cm: "28" },
      { usMen: "10.5", usWomen: "11.5", eu: "44.7", cm: "28.5" },
      { usMen: "11", usWomen: "12", eu: "45.3", cm: "29" },
      { usMen: "11.5", usWomen: "12.5", eu: "46", cm: "29.5" },
      { usMen: "12", usWomen: "13", eu: "46.7", cm: "30" },
      { usMen: "12.5", usWomen: "13.5", eu: "47.3", cm: "30.5" },
      { usMen: "13", usWomen: "14", eu: "48", cm: "31" }
    ]
  },
  ON: {
    brandLabel: "On",
    sourceLabel: "On Running official size conversion chart",
    rows: [
      { usMen: "6", usWomen: "7.5", eu: "39", cm: "24" },
      { usMen: "6.5", usWomen: "8", eu: "40", cm: "24.5" },
      { usMen: "7", usWomen: "8.5", eu: "40.5", cm: "25" },
      { usMen: "7.5", usWomen: "9", eu: "41", cm: "25.5" },
      { usMen: "8", usWomen: "9.5", eu: "42", cm: "26" },
      { usMen: "8.5", usWomen: "10", eu: "42.5", cm: "26.5" },
      { usMen: "9", usWomen: "10.5", eu: "43", cm: "27" },
      { usMen: "9.5", usWomen: "11", eu: "44", cm: "27.5" },
      { usMen: "10", usWomen: "11.5", eu: "44.5", cm: "28" },
      { usMen: "10.5", usWomen: "12", eu: "45", cm: "28.5" },
      { usMen: "11", usWomen: "12.5", eu: "46", cm: "29" },
      { usMen: "11.5", usWomen: "13", eu: "46.5", cm: "29.5" },
      { usMen: "12", usWomen: "13.5", eu: "47", cm: "30" },
      { usMen: "12.5", usWomen: "14", eu: "47.5", cm: "30.5" },
      { usMen: "13", usWomen: "14.5", eu: "48", cm: "31" }
    ]
  },
  ONITSUKA: {
    brandLabel: "Onitsuka Tiger",
    sourceLabel: "Onitsuka Tiger official size conversion chart",
    rows: [
      { usMen: "6", usWomen: "7.5", eu: "38", cm: "24" },
      { usMen: "6.5", usWomen: "8", eu: "39", cm: "24.5" },
      { usMen: "7", usWomen: "8.5", eu: "39.5", cm: "25" },
      { usMen: "7.5", usWomen: "9", eu: "40", cm: "25.25" },
      { usMen: "8", usWomen: "9.5", eu: "40.5", cm: "25.5" },
      { usMen: "8.5", usWomen: "10", eu: "41.5", cm: "26" },
      { usMen: "9", usWomen: "10.5", eu: "42", cm: "26.5" },
      { usMen: "9.5", usWomen: "11", eu: "42.5", cm: "27" },
      { usMen: "10", usWomen: "11.5", eu: "43.5", cm: "27.5" },
      { usMen: "10.5", usWomen: "12", eu: "44", cm: "28" },
      { usMen: "11", usWomen: "12.5", eu: "44.5", cm: "28.25" },
      { usMen: "11.5", usWomen: "13", eu: "45", cm: "28.5" },
      { usMen: "12", usWomen: "13.5", eu: "46", cm: "29" },
      { usMen: "12.5", usWomen: "14", eu: "46.5", cm: "29.5" },
      { usMen: "13", usWomen: "14.5", eu: "47", cm: "30" }
    ]
  },
  NEW_BALANCE: {
    brandLabel: "New Balance",
    sourceLabel: "New Balance official size conversion chart",
    rows: [
      { usMen: "6", usWomen: "7.5", eu: "38.5", cm: "24" },
      { usMen: "6.5", usWomen: "8", eu: "39", cm: "24.5" },
      { usMen: "7", usWomen: "8.5", eu: "40", cm: "25" },
      { usMen: "7.5", usWomen: "9", eu: "40.5", cm: "25.5" },
      { usMen: "8", usWomen: "9.5", eu: "41.5", cm: "26" },
      { usMen: "8.5", usWomen: "10", eu: "42", cm: "26.5" },
      { usMen: "9", usWomen: "10.5", eu: "42.5", cm: "27" },
      { usMen: "9.5", usWomen: "11", eu: "43", cm: "27.5" },
      { usMen: "10", usWomen: "11.5", eu: "44", cm: "28" },
      { usMen: "10.5", usWomen: "12", eu: "44.5", cm: "28.5" },
      { usMen: "11", usWomen: "12.5", eu: "45", cm: "29" },
      { usMen: "11.5", usWomen: "13", eu: "45.5", cm: "29.5" },
      { usMen: "12", usWomen: "13.5", eu: "46.5", cm: "30" },
      { usMen: "12.5", usWomen: "14", eu: "47", cm: "30.5" },
      { usMen: "13", usWomen: "14.5", eu: "47.5", cm: "31" }
    ]
  }
};

function normalizeBrandKey(brand = "") {
  const value = brand.trim().toUpperCase();
  if (!value) return "";
  if (value.includes("ONITSUKA")) return "ONITSUKA";
  if (value.includes("NEW BALANCE") || value === "NB") return "NEW_BALANCE";
  if (value.includes("NIKE")) return "NIKE";
  if (value.includes("ADIDAS")) return "ADIDAS";
  if (value.includes("ON RUNNING") || /\bON\b/.test(value)) return "ON";
  return "";
}

export function getBrandSizeGuide(brand) {
  const key = normalizeBrandKey(brand);
  return BRAND_SIZE_GUIDES[key] || null;
}

export function getGuideRowsForSizeGroup(guide, sizeGroup) {
  if (!guide) return [];
  const prefersWomen = sizeGroup === "WOMEN";
  return guide.rows.map((row) => ({
    usPrimary: prefersWomen ? row.usWomen : row.usMen,
    usSecondary: prefersWomen ? row.usMen : row.usWomen,
    eu: row.eu,
    cm: row.cm
  }));
}

