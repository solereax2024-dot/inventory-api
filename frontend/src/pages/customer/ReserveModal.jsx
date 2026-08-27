import { useRef, useState } from "react";
import { getColorwayImageUrl } from "../../utils/colorway";
import { formatColorwayLabel } from "../../utils/format";
import { getSortedColorwaysFromStocks } from "../../utils/stock";
import { buildSizeSections, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";

const ZOOM_LEVELS = [1, 2, 3];
const ZOOM_LABELS = ["Click to zoom", "2x · click for 3x", "3x · click to reset"];

export default function ReserveModal({ reserveModal, setReserveModal, products, reserve, setReserve, reserveNow, setMessage }) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const imgWrapRef = useRef(null);

  if (!reserveModal.isOpen) return null;

  const product = products.find((p) => String(p.id) === String(reserveModal.productId));
  const colorways = product ? getSortedColorwaysFromStocks(product.stocks) : [];
  const selectedDepartment = getDepartmentForColorway(product, reserve.colorway);
  const sizeSections = buildSizeSections(product, reserve.colorway);
  const activeSizeGroup = isUnisexDepartment(selectedDepartment)
    ? (reserve.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
    : getDefaultSizeGroup(selectedDepartment);
  const activeSizeSection = sizeSections.find((section) => section.key === activeSizeGroup) || sizeSections[0] || null;
  const zoomLevel = ZOOM_LEVELS[zoomIdx];

  const selectReserveSize = (baseSize, sizeGroup) => {
    setReserve((prev) => ({
      ...prev,
      size: baseSize,
      sizeGroup
    }));
  };

  const handleSizeGroupChange = (nextSizeGroup) => {
    const targetSection = sizeSections.find((section) => section.key === nextSizeGroup);
    const hasCurrentSize = targetSection?.rows?.some((row) => row.baseSize === reserve.size);
    const fallbackSize = (targetSection?.rows?.find((row) => row.total > 0) || targetSection?.rows?.[0])?.baseSize || reserve.size;
    setReserve((prev) => ({
      ...prev,
      sizeGroup: nextSizeGroup,
      size: hasCurrentSize ? prev.size : fallbackSize
    }));
  };

  const getOriginFromPoint = (clientX, clientY) => {
    const el = imgWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  };

  const handleMouseMove = (e) => {
    getOriginFromPoint(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    if (zoomLevel === 1) setOrigin({ x: 50, y: 50 });
  };

  const handleTouchMove = (e) => {
    if (zoomLevel <= 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    getOriginFromPoint(touch.clientX, touch.clientY);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    getOriginFromPoint(touch.clientX, touch.clientY);
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
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
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

             <div className="reserve-modal-form">
               <div className="form-section">
                 <label>Colorway</label>
                 <div className="colorway-label">{formatColorwayLabel(reserve.colorway)}</div>
               </div>

              <div className="form-section">
                <label>Size & Availability</label>
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
                            onClick={() => available && selectReserveSize(row.baseSize, activeSizeSection.key)}
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
