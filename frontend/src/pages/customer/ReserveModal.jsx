import { useRef, useState } from "react";
import { getColorwayImageUrl } from "../../utils/colorway";
import { formatColorwayLabel } from "../../utils/format";
import { getSortedColorwaysFromStocks, buildSizeStateRows } from "../../utils/stock";

const ZOOM_LEVELS = [1, 2, 3];
const ZOOM_LABELS = ["Click to zoom", "2x · click for 3x", "3x · click to reset"];

export default function ReserveModal({ reserveModal, setReserveModal, products, reserve, setReserve, reserveNow, setMessage }) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const imgWrapRef = useRef(null);

  if (!reserveModal.isOpen) return null;

  const product = products.find((p) => String(p.id) === String(reserveModal.productId));
  const colorways = product ? getSortedColorwaysFromStocks(product.stocks) : [];
  const zoomLevel = ZOOM_LEVELS[zoomIdx];

  const handleMouseMove = (e) => {
    const el = imgWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  };

  const handleMouseLeave = () => {
    if (zoomLevel === 1) setOrigin({ x: 50, y: 50 });
  };

  const handleClick = () => {
    setZoomIdx((prev) => (prev + 1) % ZOOM_LEVELS.length);
  };

  const resetZoom = () => {
    setZoomIdx(0);
    setOrigin({ x: 50, y: 50 });
  };

  return (
    <div className="modal-backdrop" onClick={() => { setReserveModal({ isOpen: false, productId: "" }); resetZoom(); }}>
      <section className="modal-panel reserve-modal" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>{product?.name || "Product"}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => { setReserveModal({ isOpen: false, productId: "" }); resetZoom(); }}
          >
            ✕
          </button>
        </div>

        {product ? (
          <div className="reserve-modal-content">
            <div
              ref={imgWrapRef}
              className={`reserve-modal-image${zoomLevel > 1 ? " zoomed" : ""}`}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            >
              {(() => {
                const imgUrl = getColorwayImageUrl(product, reserve.colorway);
                if (imgUrl) {
                  return (
                    <img
                      src={imgUrl}
                      alt={reserve.colorway}
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: `${origin.x}% ${origin.y}%`,
                      }}
                    />
                  );
                }
                return (
                  <div className="reserve-image-fallback">
                    <div className="reserve-image-fallback-icon">👟</div>
                    <div className="reserve-image-fallback-name">{product?.name}</div>
                    <div className="reserve-image-fallback-colorway">{reserve.colorway}</div>
                  </div>
                );
              })()}
              <span className="zoom-hint">{ZOOM_LABELS[zoomIdx]}</span>
            </div>

            <div className="reserve-modal-form">
              <div className="form-section">
                <label>Colorway</label>
                <select
                  value={reserve.colorway}
                  onChange={(e) => { setReserve({ ...reserve, colorway: e.target.value }); resetZoom(); }}
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
                  onClick={() => reserveNow().catch((err) => setMessage(err.message))}
                >
                  Reserve Now
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
