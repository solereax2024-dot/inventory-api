import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { US_SIZES } from "../../constants";
import { apiRequest } from "../../utils/api";
import { getColorwayImageUrl } from "../../utils/colorway";
import { formatColorwayLabel } from "../../utils/format";
import { getSortedColorwaysFromStocks } from "../../utils/stock";
import { buildSizeSections, formatSelectedSizeLabel, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";
import { getBrandSizeGuide, getGuideSectionForContext } from "../../utils/sizeGuide";
import { getOrCreateViewSessionId, shouldTrackViewForScope } from "../../utils/viewSession";

const ZOOM_LEVELS = [1, 2, 3];
const ZOOM_LABELS = ["Click to zoom", "2x · click for 3x", "3x · click to reset"];
const DESKTOP_BREAKPOINT = 721;
const DESKTOP_BASE_IMAGE_SCALE = 1.42;
const MOBILE_BASE_IMAGE_SCALE = 1;

export default function ReservePage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [reserve, setReserve] = useState({
    customerName: "",
    customerContact: "",
    notes: "",
    colorway: "",
    size: String(US_SIZES[0]),
    sizeGroup: "MEN",
    quantity: 1
  });
  const [zoomIdx, setZoomIdx] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [baseImageScale, setBaseImageScale] = useState(() => (
    window.innerWidth >= DESKTOP_BREAKPOINT ? DESKTOP_BASE_IMAGE_SCALE : MOBILE_BASE_IMAGE_SCALE
  ));
  const imgWrapRef = useRef(null);

  useEffect(() => {
    const updateScaleByViewport = () => {
      setBaseImageScale(window.innerWidth >= DESKTOP_BREAKPOINT ? DESKTOP_BASE_IMAGE_SCALE : MOBILE_BASE_IMAGE_SCALE);
    };
    window.addEventListener("resize", updateScaleByViewport);
    return () => window.removeEventListener("resize", updateScaleByViewport);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest("/api/public/products");
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setMessage(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts().catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    if (!product?.id) {
      return;
    }
    const scopeKey = `product-${product.id}`;
    if (!shouldTrackViewForScope(scopeKey)) {
      return;
    }
    const sessionId = getOrCreateViewSessionId();
    apiRequest("/api/public/analytics/views/track", "POST", {
      sessionId,
      productId: Number(product.id)
    }).catch(() => {});
  }, [product?.id]);

  const product = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );
  const colorways = useMemo(
    () => (product ? getSortedColorwaysFromStocks(product.stocks) : []),
    [product]
  );
  const prioritizedColorways = useMemo(() => {
    if (colorways.length === 0) return [];

    const clickedColorway = searchParams.get("colorway");
    const pinnedColorway =
      (clickedColorway && colorways.includes(clickedColorway) && clickedColorway)
      || (reserve.colorway && colorways.includes(reserve.colorway) && reserve.colorway)
      || null;

    if (!pinnedColorway) return colorways;
    return [pinnedColorway, ...colorways.filter((colorway) => colorway !== pinnedColorway)];
  }, [colorways, reserve.colorway, searchParams]);
  const selectedDepartment = useMemo(
    () => getDepartmentForColorway(product, reserve.colorway),
    [product, reserve.colorway]
  );
  const defaultSizeGroup = useMemo(
    () => getDefaultSizeGroup(selectedDepartment),
    [selectedDepartment]
  );
  const sizeSections = useMemo(
    () => buildSizeSections(product, reserve.colorway),
    [product, reserve.colorway]
  );
  const activeSizeGroup = isUnisexDepartment(selectedDepartment)
    ? (reserve.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
    : defaultSizeGroup;
  const activeSizeSection = useMemo(
    () => sizeSections.find((section) => section.key === activeSizeGroup) || sizeSections[0] || null,
    [sizeSections, activeSizeGroup]
  );
  const selectedSizeLabel = useMemo(
    () => formatSelectedSizeLabel(reserve.size, activeSizeGroup, selectedDepartment),
    [reserve.size, activeSizeGroup, selectedDepartment]
  );
  const sizeGuide = useMemo(() => getBrandSizeGuide(product?.brand), [product?.brand]);
  const sizeGuideSection = useMemo(
    () => getGuideSectionForContext(sizeGuide, { sizeGroup: activeSizeGroup, department: selectedDepartment }),
    [sizeGuide, activeSizeGroup, selectedDepartment]
  );
  const zoomLevel = ZOOM_LEVELS[zoomIdx];

  useEffect(() => {
    if (!product || colorways.length === 0) return;
    const preferredColorway = searchParams.get("colorway");
    const preferredSize = searchParams.get("size") || String(US_SIZES[0]);
    const selectedColorway =
      preferredColorway && colorways.includes(preferredColorway)
        ? preferredColorway
        : colorways[0];

    setReserve((prev) => ({
      ...prev,
      colorway: prev.colorway && colorways.includes(prev.colorway) ? prev.colorway : selectedColorway,
      size: prev.size || preferredSize,
      sizeGroup: prev.sizeGroup || "MEN"
    }));
  }, [product, colorways, searchParams]);

  useEffect(() => {
    if (!product || sizeSections.length === 0) return;

    const activeSection = sizeSections.find((section) => section.key === activeSizeGroup) || sizeSections[0];
    const availableRows = activeSection?.rows || [];
    const hasCurrentSize = availableRows.some((row) => row.baseSize === reserve.size);
    const fallbackRow = availableRows.find((row) => row.total > 0) || availableRows[0];
    const nextSize = hasCurrentSize ? reserve.size : (fallbackRow?.baseSize || "");
    const nextSizeGroup = isUnisexDepartment(selectedDepartment)
      ? (reserve.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
      : defaultSizeGroup;

    if (nextSize !== reserve.size || nextSizeGroup !== reserve.sizeGroup) {
      setReserve((prev) => ({
        ...prev,
        size: nextSize,
        sizeGroup: nextSizeGroup
      }));
    }
  }, [product, reserve.size, reserve.sizeGroup, sizeSections, selectedDepartment, defaultSizeGroup, activeSizeGroup]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setIsSizeGuideOpen(false);
  }, [product?.id, product?.brand]);

  const getOriginFromPoint = (clientX, clientY) => {
    const el = imgWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  };

  const resetZoom = () => {
    setZoomIdx(0);
    setOrigin({ x: 50, y: 50 });
  };

  const handleSizeGroupChange = (nextSizeGroup) => {
    const targetSection = sizeSections.find((section) => section.key === nextSizeGroup);
    const hasCurrentSize = targetSection?.rows?.some((row) => row.baseSize === reserve.size);
    const fallbackSize = (targetSection?.rows?.find((row) => row.total > 0) || targetSection?.rows?.[0])?.baseSize || reserve.size;
    setReserve({
      ...reserve,
      sizeGroup: nextSizeGroup,
      size: hasCurrentSize ? reserve.size : fallbackSize
    });
  };

  const validateReserve = () => {
    if (!product || !reserve.colorway || !reserve.size) {
      throw new Error("Please select a product, colorway, and size.");
    }

    const selectedRow = (activeSizeSection?.rows || []).find((row) => row.baseSize === reserve.size);
    if (!selectedRow || selectedRow.total <= 0) {
      throw new Error("Please select an available size.");
    }

    if (!reserve.customerName || reserve.customerName.trim() === "") {
      throw new Error("Please enter your name.");
    }
    if (!reserve.customerContact || reserve.customerContact.trim() === "") {
      throw new Error("Please enter your contact (number, FB, or IG).");
    }

    const quantity = Number(reserve.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Please enter a valid quantity.");
    }

    return {
      customerName: reserve.customerName.trim(),
      customerContact: reserve.customerContact.trim(),
      notes: reserve.notes.trim(),
      items: [
        {
          productId: Number(product.id),
          colorway: reserve.colorway,
          size: reserve.size,
          sizeGroup: activeSizeGroup,
          quantity
        }
      ]
    };
  };

  const openConfirmation = () => {
    try {
      validateReserve();
      setIsConfirmOpen(true);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const reserveNow = async () => {
    const payload = validateReserve();

    setIsSubmitting(true);
    try {
      await apiRequest("/api/public/orders/reserve", "POST", payload);
      setIsConfirmOpen(false);
      navigate("/collection");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container container-customer">
        <p className="field-hint">Loading reservation form...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container container-customer">
        <div className="card">
          <h2>Product not found</h2>
          <p className="field-hint">This product may have been removed.</p>
          <button type="button" className="btn-cancel" onClick={() => navigate("/collection")}>Back to collection</button>
        </div>
      </main>
    );
  }

  return (
    <main className="container container-wide reserve-page-shell">
      <section className="reserve-page-panel">
        <div className="breakdown-header">
          <h2>
            <Link className="reserve-page-crumb-link" to="/collection">Collection</Link>
            <span className="reserve-page-crumb-separator" aria-hidden="true"> / </span>
            <span className="reserve-page-crumb-current">{product.name}</span>
          </h2>
        </div>

        <div className="reserve-page-content">
          <div className="reserve-page-media-column">
            <div
              ref={imgWrapRef}
              className={`reserve-modal-image${zoomLevel > 1 ? " zoomed" : ""}`}
              onMouseMove={(e) => getOriginFromPoint(e.clientX, e.clientY)}
              onMouseLeave={() => zoomLevel === 1 && setOrigin({ x: 50, y: 50 })}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (!touch) return;
                getOriginFromPoint(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                if (zoomLevel <= 1) return;
                const touch = e.touches[0];
                if (!touch) return;
                getOriginFromPoint(touch.clientX, touch.clientY);
              }}
              onClick={() => setZoomIdx((prev) => (prev + 1) % ZOOM_LEVELS.length)}
            >
              {(() => {
                const imgUrl = getColorwayImageUrl(product, reserve.colorway);
                if (imgUrl) {
                  return (
                    <img
                      src={imgUrl}
                      alt={reserve.colorway}
                      style={{
                          transform: `scale(${zoomLevel * baseImageScale})`,
                        transformOrigin: `${origin.x}% ${origin.y}%`
                      }}
                    />
                  );
                }
                return (
                  <div className="reserve-image-fallback">
                    <div className="reserve-image-fallback-icon">👟</div>
                    <div className="reserve-image-fallback-name">{product.name}</div>
                    <div className="reserve-image-fallback-colorway">{reserve.colorway}</div>
                  </div>
                );
               })()}
               <span className="zoom-hint">{ZOOM_LABELS[zoomIdx]}</span>
             </div>

             <div className="colorway-display">{formatColorwayLabel(reserve.colorway)}</div>

             {colorways.length > 1 ? (
              <div className="reserve-thumbnail-row" aria-label="Colorway thumbnails">
                {prioritizedColorways.map((colorway) => {
                  const thumbUrl = getColorwayImageUrl(product, colorway);
                  return (
                    <button
                      key={`${product.id}-${colorway}`}
                      type="button"
                      className={`reserve-thumb-btn quick-tooltip ${reserve.colorway === colorway ? "active" : ""}`}
                      onClick={() => {
                        setReserve({ ...reserve, colorway });
                        resetZoom();
                      }}
                      data-tooltip={formatColorwayLabel(colorway)}
                      aria-label={formatColorwayLabel(colorway)}
                    >
                      {thumbUrl ? <img src={thumbUrl} alt={colorway} loading="lazy" /> : <span className="reserve-thumb-fallback">👟</span>}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

            <div className="reserve-modal-form reserve-page-form-column">
             <div className="form-section">
               <div className="size-label-row">
                <label>Size &amp; Availability</label>
                {sizeGuide ? (
                  <button
                    type="button"
                    className="size-guide-pill-btn"
                    onClick={() => setIsSizeGuideOpen((prev) => !prev)}
                  >
                    {isSizeGuideOpen ? "✕ Hide Size Guide" : "📏 Size Guide"}
                  </button>
                ) : null}
              </div>
              {isUnisexDepartment(selectedDepartment) ? (
                <div className="size-group-toggle" role="tablist" aria-label="Choose sizing view">
                  {sizeSections.map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      role="tab"
                      aria-selected={activeSizeGroup === section.key}
                      className={`size-group-btn ${activeSizeGroup === section.key ? "active" : ""}`}
                      onClick={() => handleSizeGroupChange(section.key)}
                    >
                      {section.key === "WOMEN" ? "Women's" : "Men's"}
                    </button>
                  ))}
                </div>
              ) : null}
              {activeSizeSection ? (
                <div className="size-section-card">
                  <p className="size-section-heading">{activeSizeSection.label}</p>
                  <div className="size-grid">
                    {activeSizeSection.rows.map((row) => {
                      const available = row.total > 0;
                      const isActive = reserve.size === row.baseSize && activeSizeGroup === activeSizeSection.key;
                      return (
                        <button
                          key={`${activeSizeSection.key}-${row.baseSize}`}
                          type="button"
                          className={`size-btn ${isActive ? "active" : ""} ${!available ? "unavailable" : ""}`}
                          onClick={() => available && setReserve({ ...reserve, size: row.baseSize, sizeGroup: activeSizeSection.key })}
                          disabled={!available}
                        >
                          <span className="size-label">US {row.displaySize}</span>
                          <span className="size-stock">
                            {row.onHand > 0 ? `${row.onHand}H` : ""}
                            {row.inTransit > 0 ? ` ${row.inTransit}T` : ""}
                            {row.preOrder > 0 ? ` ${row.preOrder}P` : ""}
                            {row.total === 0 ? "Out" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {isUnisexDepartment(selectedDepartment) ? (
                <small className="field-hint">Unisex pairs show equivalent men&apos;s and women&apos;s US sizing.</small>
              ) : selectedDepartment === "MEN" ? (
                <small className="field-hint">Men&apos;s only sizing.</small>
              ) : selectedDepartment === "WOMEN" ? (
                <small className="field-hint">Women&apos;s only sizing.</small>
              ) : null}
              <small className="field-hint">H=On-hand, T=In-transit, P=Pre-order</small>
              {isSizeGuideOpen && sizeGuide && sizeGuideSection ? (
                <div className="modal-overlay" onClick={() => setIsSizeGuideOpen(false)}>
                  <section className="modal-panel modal-panel-compact size-guide-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="breakdown-header">
                      <h2>{sizeGuide.brandLabel} Size Guide</h2>
                      <button type="button" className="modal-close-btn" aria-label="Close size guide" onClick={() => setIsSizeGuideOpen(false)}>✕</button>
                    </div>
                    <div className="size-guide-table-wrap">
                      <table className="size-guide-table">
                        <thead>
                          <tr>
                            {sizeGuideSection.columns.map((column) => (
                              <th key={`guide-head-${column.key}`}>{column.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sizeGuideSection.rows.map((row, index) => (
                            <tr key={`${sizeGuide.brandLabel}-${sizeGuideSection.label || "guide"}-${index}`}>
                              {sizeGuideSection.columns.map((column) => (
                                <td key={`guide-cell-${column.key}-${index}`}>{row[column.key] || "-"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <small className="field-hint" style={{ marginTop: 4 }}>
                      Reference from {sizeGuide.sourceLabel}. Actual fit may vary by model.
                    </small>
                    {sizeGuide.fitNote ? (
                      <small className="field-hint" style={{ marginTop: 0 }}>{sizeGuide.fitNote}</small>
                    ) : null}
                  </section>
                </div>
              ) : null}
            </div>


            <div className="form-section">
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                value={reserve.quantity}
                onChange={(e) => setReserve({ ...reserve, quantity: e.target.value })}
              />
            </div>

            <div className="form-section">
              <label>Your Name <span className="required">*</span></label>
              <input
                placeholder="Enter your name"
                value={reserve.customerName}
                onChange={(e) => setReserve({ ...reserve, customerName: e.target.value })}
                required
              />
            </div>

            <div className="form-section">
              <label>Contact (Number / FB / IG) <span className="required">*</span></label>
              <input
                placeholder="Enter your contact"
                value={reserve.customerContact}
                onChange={(e) => setReserve({ ...reserve, customerContact: e.target.value })}
                required
              />
            </div>

            <div className="form-section">
              <label>Notes (optional)</label>
              <input
                placeholder="Add any notes"
                value={reserve.notes}
                onChange={(e) => setReserve({ ...reserve, notes: e.target.value })}
              />
            </div>

            <div className="reserve-form-actions">
              <button
                className="btn-primary reserve-submit-btn"
                onClick={openConfirmation}
              >
                Reserve Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {isConfirmOpen ? (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsConfirmOpen(false)}>
          <section className="modal-panel reserve-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header reserve-confirm-header">
              <h2>Confirm Reservation</h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close reservation confirmation"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <div className="reserve-confirm-summary">
              <div className="reserve-confirm-product">
                <span className="reserve-confirm-label">Product</span>
                <strong>{product.name}</strong>
                {product.brand ? <span className="reserve-confirm-subtle">{product.brand}</span> : null}
              </div>

              <div className="reserve-confirm-grid">
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Colorway</span>
                  <strong>{formatColorwayLabel(reserve.colorway)}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Size</span>
                  <strong>{selectedSizeLabel || `US ${reserve.size}`}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Quantity</span>
                  <strong>{reserve.quantity}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Name</span>
                  <strong>{reserve.customerName.trim()}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Contact</span>
                  <strong>{reserve.customerContact.trim()}</strong>
                </div>
                <div className="reserve-confirm-item reserve-confirm-item-wide">
                  <span className="reserve-confirm-label">Notes</span>
                  <strong>{reserve.notes.trim() || "No notes provided"}</strong>
                </div>
              </div>
            </div>

            <div className="reserve-confirm-actions">
              <button
                type="button"
                className="btn-cancel reserve-confirm-cancel-btn"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
              >
                Edit Details
              </button>
              <button
                type="button"
                className="btn-primary reserve-confirm-submit-btn"
                onClick={() => reserveNow().catch((err) => setMessage(err.message))}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm Reservation"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}
