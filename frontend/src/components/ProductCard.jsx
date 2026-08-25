import { useEffect, useMemo, useState } from "react";
import { getColorwayDetails, getColorwayImageUrl, sanitizeColorways, sortColorways } from "../utils/colorway";
import { formatEnumLabel } from "../utils/format";
import "../styles/product-card.css";

const PHP_CURRENCY = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatPriceDisplay(minPrice, maxPrice) {
  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (!Number.isFinite(min) && !Number.isFinite(max)) {
    return "";
  }
  if (Number.isFinite(min) && Number.isFinite(max)) {
    if (Math.abs(min - max) < 0.01) {
      return PHP_CURRENCY.format(min);
    }
    return `${PHP_CURRENCY.format(Math.min(min, max))} - ${PHP_CURRENCY.format(Math.max(min, max))}`;
  }
  const fallback = Number.isFinite(min) ? min : max;
  return PHP_CURRENCY.format(fallback);
}

export default function ProductCard({ product, onReserveClick, initialColorway }) {
  const colorways = useMemo(() => {
    return sortColorways(sanitizeColorways((product.stocks || []).map((stock) => stock.colorway)));
  }, [product.stocks]);

  const [selectedColorway, setSelectedColorway] = useState(initialColorway || colorways[0] || "DEFAULT");

  useEffect(() => {
    if (initialColorway) {
      setSelectedColorway(initialColorway);
    } else if (!colorways.includes(selectedColorway)) {
      setSelectedColorway(colorways[0] || "DEFAULT");
    }
  }, [colorways, selectedColorway, initialColorway]);

  const colorwayDetails = useMemo(
    () => getColorwayDetails(product, selectedColorway),
    [product, selectedColorway]
  );
  const uniqueViewCount = Number(product?.viewCount || 0);
  const priceLabel = formatPriceDisplay(colorwayDetails?.minPrice, colorwayDetails?.maxPrice);

  return (
    <article className="card product-card">
      <button type="button" className="product-image-wrap product-image-button" onClick={() => onReserveClick(product.id, selectedColorway)}>
        {colorwayDetails.department && (
          <span className="department-chip department-chip-on-image">{formatEnumLabel(colorwayDetails.department)}</span>
        )}
        {(() => {
          const imgUrl = getColorwayImageUrl(product, selectedColorway);
          if (imgUrl) return <img className="product-image" src={imgUrl} alt={product.name} loading="lazy" />;
          return (
            <div className="product-image-fallback">
              <span>👟</span>
              <span>{product.name}</span>
            </div>
          );
        })()}
      </button>
      <div className="product-card-footer">
        <div className="product-card-meta">
          <small className="brand">{product.brand || ""}</small>
          <small className="product-demand">{uniqueViewCount.toLocaleString()} view{uniqueViewCount === 1 ? "" : "s"}</small>
        </div>
        <h3>{product.name}</h3>
        {priceLabel ? (
          <div className="product-price-row">
            <p className="product-price">{priceLabel}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
