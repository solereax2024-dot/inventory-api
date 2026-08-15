import { useEffect, useMemo, useState } from "react";
import { getColorwayImageUrl, sanitizeColorways, colorwayPriority } from "../utils/colorway";
import { formatColorwayLabel, formatEnumLabel } from "../utils/format";
import "../styles/product-card.css";

export default function ProductCard({ product, onReserveClick }) {
  const colorways = useMemo(() => {
    const list = sanitizeColorways((product.stocks || []).map((stock) => stock.colorway));
    return list.sort((a, b) => {
      const p = colorwayPriority(a) - colorwayPriority(b);
      return p !== 0 ? p : a.localeCompare(b);
    });
  }, [product.stocks]);

  const [selectedColorway, setSelectedColorway] = useState(colorways[0] || "DEFAULT");

  useEffect(() => {
    if (!colorways.includes(selectedColorway)) {
      setSelectedColorway(colorways[0] || "DEFAULT");
    }
  }, [colorways, selectedColorway]);

  return (
    <article className="card product-card">
      <button type="button" className="product-image-wrap product-image-button" onClick={() => onReserveClick(product.id, selectedColorway)}>
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
      {colorways.length > 1 && (
        <div className="thumbnail-row">
          {colorways.map((colorway) => (
            <button
              key={`${product.id}-${colorway}`}
              type="button"
              className={`thumb-btn quick-tooltip ${selectedColorway === colorway ? "active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setSelectedColorway(colorway); }}
              data-tooltip={formatColorwayLabel(colorway)}
              aria-label={formatColorwayLabel(colorway)}
            >
              {(() => {
                const thumbUrl = getColorwayImageUrl(product, colorway);
                if (thumbUrl) return <img src={thumbUrl} alt={colorway} loading="lazy" />;
                return <span style={{ fontSize: "18px" }}>👟</span>;
              })()}
            </button>
          ))}
        </div>
      )}
      <div className="product-card-footer">
        <div className="product-card-meta">
          <small className="brand">{product.brand || ""}</small>
          {product.department && (
            <span className="department-chip">{formatEnumLabel(product.department)}</span>
          )}
        </div>
        <h3>{product.name}</h3>
      </div>
    </article>
  );
}
