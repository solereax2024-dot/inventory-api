import { useEffect, useMemo, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { getColorwayDetails, getColorwayImageUrl, sanitizeColorways, sortColorways } from "../../utils/colorway";
import { useCountdown } from "../../hooks";
import { formatEnumLabel, formatSaleStartLabel } from "../../utils/format";
import { applyPromotionPreviewPrice, formatMaskedPriceDisplay, formatPriceDisplay } from "../../utils/price";
import "../../styles/product-card.css";

function toCompactSaleCampaignLabel(name) {
  const value = String(name || "").trim();
  if (!value) {
    return "Sale";
  }
  if (value.length <= 12) {
    return value;
  }
  const matched = value.match(/\b\d{1,2}\.\d{1,2}\b/);
  if (matched?.[0]) {
    return matched[0];
  }
  return `${value.slice(0, 10).trim()}…`;
}

export default function ProductCard({
  product,
  onReserveClick,
  initialColorway,
  showSaleBadge = true,
  metaLayout = "line",
  autoCycleColorways = false,
  autoCycleOffsetMs = 0,
  autoCycleIntervalMs = 2200,
  autoCycleJitterMs = 0
}) {
  const fallbackPrimaryColorway = String(product?.primaryColorway || product?.mainColor || "DEFAULT");
  const colorways = useMemo(() => {
    const fromSummary = sortColorways(sanitizeColorways(product?.colorways || []));
    if (fromSummary.length > 0) {
      return fromSummary;
    }
    const fromStocks = sortColorways(sanitizeColorways((product?.stocks || []).map((stock) => stock.colorway)));
    if (fromStocks.length > 0) {
      return fromStocks;
    }
    return [fallbackPrimaryColorway];
  }, [product?.colorways, product?.stocks, fallbackPrimaryColorway]);

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
        maxPrice: product?.maxPrice ?? product?.price ?? null,
        hasStock: Boolean(product?.hasStock ?? false)
      };
    },
    [product, selectedColorway]
  );
  const isSelectedColorwayOutOfStock = !Boolean(colorwayDetails?.hasStock ?? product?.hasStock ?? false);
  const uniqueViewCount = Number(product?.viewCount || 0);
  const isLegacyMetaLayout = metaLayout === "legacy";
  const brandLabel = product?.brand || (colorwayDetails?.department ? formatEnumLabel(colorwayDetails.department) : "");
  const priceLabel = formatPriceDisplay(colorwayDetails?.minPrice, colorwayDetails?.maxPrice);
  const primarySalePromotion = Array.isArray(product?.salePromotions) && product.salePromotions.length > 0
    ? product.salePromotions[0]
    : null;
  const saleCampaignName = String(primarySalePromotion?.name || "").trim();
  const compactSaleCampaignLabel = toCompactSaleCampaignLabel(saleCampaignName);
  const isUpcomingSale = showSaleBadge && Boolean(primarySalePromotion) && !primarySalePromotion.activeNow;
  const upcomingCountdown = useCountdown(primarySalePromotion?.startsAt, isUpcomingSale);
  const canPreviewSalePrice = showSaleBadge && Boolean(primarySalePromotion) && !primarySalePromotion.buyOneTakeOne && primarySalePromotion.activeNow;
  const salePriceLabel = canPreviewSalePrice
    ? formatPriceDisplay(
      applyPromotionPreviewPrice(colorwayDetails?.minPrice ?? colorwayDetails?.price, primarySalePromotion),
      applyPromotionPreviewPrice(colorwayDetails?.maxPrice ?? colorwayDetails?.price, primarySalePromotion)
    )
    : "";
  const upcomingSalePriceLabel = isUpcomingSale && !primarySalePromotion?.buyOneTakeOne
    ? formatMaskedPriceDisplay(
      applyPromotionPreviewPrice(colorwayDetails?.minPrice ?? colorwayDetails?.price, primarySalePromotion),
      applyPromotionPreviewPrice(colorwayDetails?.maxPrice ?? colorwayDetails?.price, primarySalePromotion)
    )
    : "";
  const saleStartLabel = isUpcomingSale
    ? `${saleCampaignName || "Upcoming sale"} · ${formatSaleStartLabel(primarySalePromotion?.startsAt)} · ${upcomingCountdown.label || "Coming soon"}`
    : "";

  return (
    <article className={`card product-card${showSaleBadge && primarySalePromotion ? " is-sale-product-card" : ""}${isUpcomingSale ? " is-sale-coming-soon-product-card" : ""}`}>
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
        {colorwayDetails.department ? (
          <span className="department-chip department-chip-bottom">{formatEnumLabel(colorwayDetails.department)}</span>
        ) : null}
        <small className="product-demand-overlay">
          <Eye size={11} strokeWidth={2.2} />
          {uniqueViewCount.toLocaleString()}
        </small>
        {isSelectedColorwayOutOfStock ? (
          <span className="product-sold-out-badge">Sold Out</span>
        ) : null}
        {showSaleBadge && primarySalePromotion ? (
          <span className="product-sale-badge">
            {isUpcomingSale
              ? `${compactSaleCampaignLabel} Soon · ${upcomingCountdown.label || "Soon"}`
              : (primarySalePromotion.buyOneTakeOne ? "B1T1" : "Sale")}
          </span>
        ) : null}
        {(() => {
          const imgUrl = product?.colorwayImages
            ? getColorwayImageUrl(product, selectedColorway)
            : (product?.imageUrl || null);
          if (imgUrl) {
            return (
              <img
                key={`${product.id}-${selectedColorway}`}
                  className={`product-image${autoCycleColorways ? " product-image-cycle" : ""}${isSelectedColorwayOutOfStock ? " product-image-out-of-stock" : ""}`}
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
        {isLegacyMetaLayout ? (
          <>
            <div className="product-card-meta">
              <small className="brand">{product.brand || ""}</small>
            </div>
            <h3>{product.name}</h3>
            <div className={`product-price-row${priceLabel ? "" : " empty"}${priceLabel && salePriceLabel ? " product-price-row--sale" : ""}${priceLabel && upcomingSalePriceLabel ? " product-price-row--upcoming" : ""}`}>
              {priceLabel && salePriceLabel ? (
                <>
                  <p className="product-price-sale">{salePriceLabel}</p>
                  <p className="product-price product-price-original">{priceLabel}</p>
                </>
              ) : priceLabel && upcomingSalePriceLabel ? (
                <>
                  <p className="product-price-sale product-price-sale-teaser">{upcomingSalePriceLabel}</p>
                  <p className="product-price">{priceLabel}</p>
                </>
              ) : priceLabel ? (
                <p className="product-price">{priceLabel}</p>
              ) : (
                <span className="product-price-placeholder" aria-hidden="true">&nbsp;</span>
              )}
            </div>
            {saleStartLabel ? <small className="product-sale-caption">{saleStartLabel}</small> : null}
          </>
        ) : (
          <div className="product-card-corner-row">
            <div className="product-card-corner-left">
              {brandLabel ? <small className="brand">{brandLabel}</small> : null}
              <h3>{product.name}</h3>
            </div>
            <div className="product-card-corner-right">
              {priceLabel && salePriceLabel ? (
                <>
                  <p className="product-price-sale">{salePriceLabel}</p>
                  <p className="product-price product-price-original">{priceLabel}</p>
                </>
              ) : priceLabel && upcomingSalePriceLabel ? (
                <>
                  <p className="product-price-sale product-price-sale-teaser">{upcomingSalePriceLabel}</p>
                  <p className="product-price">{priceLabel}</p>
                </>
              ) : priceLabel ? (
                <p className="product-price">{priceLabel}</p>
              ) : (
                <span className="product-price-placeholder" aria-hidden="true">&nbsp;</span>
              )}
            </div>
          </div>
        )}
        {!isLegacyMetaLayout && saleStartLabel ? (
          <small className="product-sale-caption">{saleStartLabel}</small>
        ) : null}
      </div>
    </article>
  );
}
