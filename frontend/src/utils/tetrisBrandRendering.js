import { BLOCK_COLORS, FALLBACK_BRANDS, KNOWN_BRAND_LABELS } from "../constants/tetris";

export function getAvailableBrandTiles(brandTiles) {
  return Array.isArray(brandTiles) && brandTiles.length > 0 ? brandTiles : FALLBACK_BRANDS;
}

export function getBrandColorForTile(tileId, brandTiles) {
  const availableTiles = getAvailableBrandTiles(brandTiles);

  if (typeof tileId === "number" && Number.isFinite(tileId)) {
    return BLOCK_COLORS[Math.abs(tileId) % BLOCK_COLORS.length];
  }

  const fallbackIndex = availableTiles.findIndex((tile) => tile.id === tileId);
  return BLOCK_COLORS[(fallbackIndex >= 0 ? fallbackIndex : 0) % BLOCK_COLORS.length];
}

export function getBrandTileById(tileId, brandTiles) {
  const availableTiles = getAvailableBrandTiles(brandTiles);

  return availableTiles.find((tile) => tile.id === tileId)
    || (typeof tileId === "number" ? availableTiles[Math.abs(tileId) % availableTiles.length] : null)
    || availableTiles[0]
    || FALLBACK_BRANDS[0];
}

export function getBrandShortLabel(brandName) {
  if (!brandName) return "?";

  const directLabel = KNOWN_BRAND_LABELS[brandName.toLowerCase()];
  if (directLabel) return directLabel;

  const normalizedKey = brandName.toLowerCase().replace(/\s+/g, "-");
  const normalizedLabel = KNOWN_BRAND_LABELS[normalizedKey];
  if (normalizedLabel) return normalizedLabel;

  return brandName.substring(0, 3).toUpperCase();
}

export function createPreviewMatrix(piece) {
  if (!Array.isArray(piece) || piece.length === 0) return [];
  return piece.map((row) => (Array.isArray(row) ? [...row] : []));
}

export function getPreviewGridStyle(matrix) {
  const rowCount = matrix.length || 1;
  const columnCount = Math.max(1, ...matrix.map((row) => row.length || 0));

  return {
    gridTemplateColumns: `repeat(${columnCount}, var(--tetris-mini-block-size))`,
    gridTemplateRows: `repeat(${rowCount}, var(--tetris-mini-block-size))`,
  };
}

export function getMedalIcon(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

