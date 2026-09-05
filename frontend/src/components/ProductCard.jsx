import { useEffect, useMemo, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { getColorwayDetails, getColorwayImageUrl, sanitizeColorways, sortColorways } from "../utils/colorway";
import { formatEnumLabel } from "../utils/format";
import { formatPriceDisplay } from "../utils/price";
import "../styles/product-card.css";


export default function ProductCard({
  product,
  onReserveClick,
  initialColorway,
  autoCycleColorways = false,
  autoCycleOffsetMs = 0,
  autoCycleIntervalMs = 2200,
  autoCycleJitterMs = 0
}) {
  const fallbackPrimaryColorway = String(product?.primaryColorway || product?.mainColor || "DEFAULT");
  const colorways = useMemo(() => {
    const fromStocks = sortColorways(sanitizeColorways((product?.stocks || []).map((stock) => stock.colorway)));
    if (fromStocks.length > 0) {
      return fromStocks;
    }
    return [fallbackPrimaryColorway];
  }, [product?.stocks, fallbackPrimaryColorway]);

  const [selectedColorway, setSelectedColorway] = useState(initialColorway || fallbackPrimaryColorway || colorways[0] || "DEFAULT");
  const [isCyclePaused, setIsCyclePaused] = useState(false);
  const hasCycleStartedRef = useRef(false);
  const resumeTimerRef = useRef(null);

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const scheduleResume = (delayMs = 0) => {
    if (!autoCycleColorways) {
      return;
    }
    clearResumeTimer();
    const nextDelay = Math.max(0, Number(delayMs) || 0);
    if (nextDelay === 0) {
      setIsCyclePaused(false);
      return;
    }
    resumeTimerRef.current = window.setTimeout(() => {
      setIsCyclePaused(false);
      resumeTimerRef.current = null;
    }, nextDelay);
  };

  useEffect(() => {
    if (initialColorway) {
      setSelectedColorway(initialColorway);
    }
  }, [initialColorway]);

  useEffect(() => {
    if (!initialColorway && !colorways.includes(selectedColorway)) {
      setSelectedColorway(colorways[0] || "DEFAULT");
    }
  }, [colorways, selectedColorway, initialColorway]);

  useEffect(() => () => clearResumeTimer(), []);

  useEffect(() => {
    if (!autoCycleColorways || colorways.length <= 1 || isCyclePaused) {
      return undefined;
    }

    const advanceColorway = () => {
      setSelectedColorway((current) => {
        const currentIndex = colorways.indexOf(current);
        if (currentIndex < 0) {
          return colorways[0] || "DEFAULT";
        }
        const nextIndex = (currentIndex + 1) % colorways.length;
        return colorways[nextIndex] || current;
      });
    };

    const cycleMs = Math.max(1200, Number(autoCycleIntervalMs) || 2200);
    const cycleJitterMs = Math.max(0, Number(autoCycleJitterMs) || 0);
    const getNextDelay = () => {
      if (cycleJitterMs <= 0) {
        return cycleMs;
      }
      const minDelay = Math.max(900, cycleMs - cycleJitterMs);
      const maxDelay = cycleMs + cycleJitterMs;
      return Math.round(minDelay + (Math.random() * (maxDelay - minDelay)));
    };

    let timeoutId;
    const scheduleNext = (delayMs) => {
      timeoutId = window.setTimeout(() => {
        advanceColorway();
        hasCycleStartedRef.current = true;
        scheduleNext(getNextDelay());
      }, Math.max(0, Number(delayMs) || 0));
    };

    const initialDelay = hasCycleStartedRef.current ? getNextDelay() : Math.max(0, Number(autoCycleOffsetMs) || 0);
    scheduleNext(initialDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoCycleColorways, autoCycleOffsetMs, autoCycleIntervalMs, autoCycleJitterMs, colorways, isCyclePaused]);

  const colorwayDetails = useMemo(
    () => {
      if (product?.colorwayDetails && typeof product.colorwayDetails === "object" && Object.keys(product.colorwayDetails).length > 0) {
        return getColorwayDetails(product, selectedColorway);
      }
      return {
        description: product?.description || "",
        department: product?.department || "",
        category: product?.category || "",
        productType: product?.productType || "",
        price: product?.price ?? null,
        minPrice: product?.minPrice ?? product?.price ?? null,
        maxPrice: product?.maxPrice ?? product?.price ?? null
      };
    },
    [product, selectedColorway]
  );
  const uniqueViewCount = Number(product?.viewCount || 0);
  const priceLabel = formatPriceDisplay(colorwayDetails?.minPrice, colorwayDetails?.maxPrice);

  return (
    <article className="card product-card">
      <button
        type="button"
        className="product-image-wrap product-image-button"
        onMouseEnter={() => {
          if (!autoCycleColorways) return;
          clearResumeTimer();
          setIsCyclePaused(true);
        }}
        onMouseLeave={() => scheduleResume(720)}
        onFocus={() => {
          if (!autoCycleColorways) return;
          clearResumeTimer();
          setIsCyclePaused(true);
        }}
        onBlur={() => scheduleResume(820)}
        onPointerDown={() => {
          if (!autoCycleColorways) return;
          clearResumeTimer();
          setIsCyclePaused(true);
        }}
        onPointerUp={() => scheduleResume(1100)}
        onPointerCancel={() => scheduleResume(820)}
        onClick={() => {
          scheduleResume(1200);
          onReserveClick(product.id, selectedColorway);
        }}
      >
        {colorwayDetails.department && (
          <span className="department-chip department-chip-bottom">{formatEnumLabel(colorwayDetails.department)}</span>
        )}
        <small className="product-demand-overlay">
          <Eye size={11} strokeWidth={2.2} />
          {uniqueViewCount.toLocaleString()}
        </small>
        {(() => {
          const imgUrl = product?.colorwayImages
            ? getColorwayImageUrl(product, selectedColorway)
            : (product?.imageUrl || null);
          if (imgUrl) {
            return (
              <img
                key={`${product.id}-${selectedColorway}`}
                className={`product-image${autoCycleColorways ? " product-image-cycle" : ""}`}
                src={imgUrl}
                alt={product.name}
                loading="lazy"
              />
            );
          }
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
        </div>
        <h3>{product.name}</h3>
        <div className={`product-price-row${priceLabel ? "" : " empty"}`}>
          {priceLabel ? (
            <p className="product-price">{priceLabel}</p>
          ) : (
            <span className="product-price-placeholder" aria-hidden="true">&nbsp;</span>
          )}
        </div>
      </div>
    </article>
  );
}
