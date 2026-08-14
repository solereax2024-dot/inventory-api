import { getColorwayImageUrl } from "../../utils/colorway";
import { formatColorwayLabel } from "../../utils/format";
import { getSortedColorwaysFromStocks, buildSizeStateRows } from "../../utils/stock";

export default function ReserveModal({ reserveModal, setReserveModal, products, reserve, setReserve, reserveNow, setMessage }) {
  if (!reserveModal.isOpen) return null;

  const product = products.find((p) => String(p.id) === String(reserveModal.productId));
  const colorways = product ? getSortedColorwaysFromStocks(product.stocks) : [];

  return (
    <div className="modal-backdrop" onClick={() => setReserveModal({ isOpen: false, productId: "" })}>
      <section className="modal-panel reserve-modal" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>
            {product?.name || "Product"}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setReserveModal({ isOpen: false, productId: "" })}
          >
            ✕
          </button>
        </div>

        {product ? (
          <div className="reserve-modal-content">
            <div className="reserve-modal-image" key={reserve.colorway}>
              {(() => {
                const imgUrl = getColorwayImageUrl(product, reserve.colorway);
                if (imgUrl) {
                  return <img src={imgUrl} alt={reserve.colorway} />;
                }
                return (
                  <div style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #1F2937 0%, #374151 100%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F3F4F6",
                    textAlign: "center",
                    padding: "24px"
                  }}>
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>👟</div>
                    <div style={{ fontSize: "16px", fontWeight: "600" }}>{product?.name}</div>
                    <div style={{ fontSize: "12px", marginTop: "8px", opacity: "0.8" }}>{reserve.colorway}</div>
                  </div>
                );
              })()}
            </div>
            <div className="reserve-modal-form">
              <div className="form-section">
                <label>Colorway</label>
                <select
                  value={reserve.colorway}
                  onChange={(e) => setReserve({ ...reserve, colorway: e.target.value })}
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
                          {row.inTransit > 0 ? `${row.inTransit > 0 ? " " : ""}${row.inTransit}T` : ""}
                          {row.preOrder > 0 ? `${row.preOrder > 0 ? " " : ""}${row.preOrder}P` : ""}
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

              <button
                className="btn-primary"
                onClick={() => reserveNow().catch((err) => setMessage(err.message))}
              >
                Reserve Now
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
