import { getColorwayDetails } from "./colorway";
import { buildSizeStateRows } from "./stock";

const WOMENS_SIZE_OFFSET = -1.5;
const WOMENS_MIN_SIZE = 5;
const WOMENS_MAX_SIZE = 11;

function toNumericSize(size) {
  const value = Number(size);
  return Number.isFinite(value) ? value : null;
}

function formatUsSize(size) {
  const numeric = Number(size);
  if (!Number.isFinite(numeric)) {
    return String(size || "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, "");
}

export function getDepartmentForColorway(product, colorway) {
  return (getColorwayDetails(product, colorway)?.department || product?.department || "").toUpperCase();
}

export function isUnisexDepartment(department) {
  return String(department || "").toUpperCase() === "UNISEX";
}

export function getDefaultSizeGroup(department) {
  return String(department || "").toUpperCase() === "WOMEN" ? "WOMEN" : "MEN";
}

export function convertMenSizeToWomen(size) {
  const numeric = toNumericSize(size);
  if (numeric === null) {
    return String(size || "");
  }
  return formatUsSize(numeric + WOMENS_SIZE_OFFSET);
}

export function buildSizeSections(product, colorway) {
  const rows = buildSizeStateRows(product, colorway);
  const department = getDepartmentForColorway(product, colorway);

  const mapRows = (sizeGroup) => rows
    .map((row) => ({
      ...row,
      baseSize: row.size,
      displaySize: sizeGroup === "WOMEN" && isUnisexDepartment(department)
        ? convertMenSizeToWomen(row.size)
        : row.size,
      sizeGroup
    }))
    .filter((row) => {
      if (!(sizeGroup === "WOMEN" && isUnisexDepartment(department))) {
        return true;
      }
      const numericSize = toNumericSize(row.displaySize);
      return numericSize !== null && numericSize >= WOMENS_MIN_SIZE && numericSize <= WOMENS_MAX_SIZE;
    });

  if (isUnisexDepartment(department)) {
    return [
      { key: "MEN", label: "Men's US", rows: mapRows("MEN") },
      { key: "WOMEN", label: "Women's US", rows: mapRows("WOMEN") }
    ];
  }

  const singleLabel = department === "WOMEN"
    ? "Women's US"
    : department === "KIDS"
      ? "Kids' US"
      : "US Sizes";

  return [{
    key: getDefaultSizeGroup(department),
    label: singleLabel,
    rows: mapRows(getDefaultSizeGroup(department))
  }];
}

export function formatSelectedSizeLabel(baseSize, sizeGroup, department) {
  if (!baseSize) {
    return "";
  }

  const normalizedDepartment = String(department || "").toUpperCase();
  if (normalizedDepartment === "UNISEX") {
    return sizeGroup === "WOMEN"
      ? `Women's US ${convertMenSizeToWomen(baseSize)}`
      : `Men's US ${baseSize}`;
  }
  if (normalizedDepartment === "WOMEN") {
    return `Women's US ${baseSize}`;
  }
  if (normalizedDepartment === "KIDS") {
    return `Kids' US ${baseSize}`;
  }
  return `US ${baseSize}`;
}

