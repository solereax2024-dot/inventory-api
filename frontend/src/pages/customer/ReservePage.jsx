import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { US_SIZES } from "../../constants";
import { apiRequest } from "../../utils/api";
import { getColorwayImageUrl } from "../../utils/colorway";
import { formatColorwayLabel } from "../../utils/format";
import { getSortedColorwaysFromStocks, buildSizeStateRows } from "../../utils/stock";

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
  const [reserve, setReserve] = useState({
    customerName: "",
    customerContact: "",
    notes: "",
    colorway: "",
    size: String(US_SIZES[0]),
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

  const product = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );
  const colorways = useMemo(
    () => (product ? getSortedColorwaysFromStocks(product.stocks) : []),
    [product]
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
      size: prev.size || preferredSize
    }));
  }, [product, colorways, searchParams]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

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

  const validateReserve = () => {
    if (!product || !reserve.colorway || !reserve.size) {
      throw new Error("Please select a product, colorway, and size.");
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
          <h2>{product.name}</h2>
          <button type="button" className="btn-cancel reserve-page-back-btn" onClick={() => navigate("/collection")}>Back</button>
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

            {colorways.length > 1 ? (
              <div className="reserve-thumbnail-row" aria-label="Colorway thumbnails">
                {colorways.map((colorway) => {
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
              <label>Colorway</label>
              <select
                value={reserve.colorway}
                onChange={(e) => {
                  setReserve({ ...reserve, colorway: e.target.value });
                  resetZoom();
                }}
              >
                {colorways.map((colorway) => (
                  <option key={colorway} value={colorway}>
                    {formatColorwayLabel(colorway)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <label>Size & Availability</label>
              <div className="size-grid">
                {buildSizeStateRows(product, reserve.colorway).map((row) => {
                  const available = row.total > 0;
                  return (
                    <button
                      key={row.size}
                      type="button"
                      className={`size-btn ${reserve.size === row.size ? "active" : ""} ${!available ? "unavailable" : ""}`}
                      onClick={() => available && setReserve({ ...reserve, size: row.size })}
                      disabled={!available}
                    >
                      <span className="size-label">US {row.size}</span>
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
              <small className="field-hint">H=On-hand, T=In-transit, P=Pre-order</small>
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
                  <strong>US {reserve.size}</strong>
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

