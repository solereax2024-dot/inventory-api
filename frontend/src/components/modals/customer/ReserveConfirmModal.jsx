import { PHP_CURRENCY } from "../../../utils/price";
import { getColorwayImageUrl } from "../../../utils/colorway";
import { formatColorwayLabel } from "../../../utils/format";

export default function ReserveConfirmModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  product,
  reserve,
  isSelectedSizePreOrder,
  selectedColorwayPriceLabel,
  selectedSizeLabel,
  selectedSizePrice,
  selectedSizePriceLabel,
  CUSTOMER_MOP_OPTIONS,
  promoCode,
  onPromoCodeChange,
  appliedPromotion,
  autoSalePromotion,
  onApplyPromo,
  isApplyingPromo,
  promoMessage,
  estimatedReservationValue,
  promoAppliedDiscount,
  promoAppliedTotal
}) {
  if (!isOpen) return null;
  const hasAutoSale = !appliedPromotion && Boolean(autoSalePromotion?.valid);

  return (
    <div className="modal-overlay" onClick={() => !isSubmitting && onClose()}>
      <section className="modal-panel reserve-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header reserve-confirm-header">
          <h2>Confirm Reservation</h2>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Close reservation confirmation"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className="reserve-confirm-summary">
          <div className="reserve-confirm-product-visual">
            {(() => {
              const imgUrl = getColorwayImageUrl(product, reserve.colorway);
              return imgUrl
                ? <img src={imgUrl} alt={reserve.colorway} className="reserve-confirm-thumb" />
                : <div className="reserve-confirm-thumb-fallback">👟</div>;
            })()}
            <div className="reserve-confirm-product-info">
              <div className="reserve-confirm-product-name">{product.name}</div>
              {product.brand ? <div className="reserve-confirm-product-brand">{product.brand}</div> : null}
              {isSelectedSizePreOrder ? <span className="reserve-confirm-preorder-badge">Pre-Order Item</span> : null}
              {selectedColorwayPriceLabel ? (
                <div className="reserve-confirm-price-hint">{selectedColorwayPriceLabel}</div>
              ) : null}
            </div>
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
            {selectedSizePrice !== null ? (
              <div className="reserve-confirm-item">
                <span className="reserve-confirm-label">Unit Price</span>
                <strong>{selectedSizePriceLabel}</strong>
              </div>
            ) : null}
            <div className="reserve-confirm-item">
              <span className="reserve-confirm-label">Name</span>
              <strong>{reserve.customerName.trim()}</strong>
            </div>
            <div className="reserve-confirm-item">
              <span className="reserve-confirm-label">Contact</span>
              <strong>{reserve.customerContact.trim()}</strong>
            </div>
            <div className="reserve-confirm-item">
              <span className="reserve-confirm-label">MOP</span>
              <strong>
                {reserve.mop === "OTHER"
                  ? (reserve.mopOther.trim() || "Other")
                  : (CUSTOMER_MOP_OPTIONS.find((option) => option.value === reserve.mop)?.label || reserve.mop || "-")}
              </strong>
            </div>
            <div className="reserve-confirm-item reserve-confirm-item-wide">
              <span className="reserve-confirm-label">Notes</span>
              <strong>{reserve.notes.trim() || "No notes provided"}</strong>
            </div>
          </div>

          <div className="reserve-confirm-promo-panel modal-card-soft">
            <div className="reserve-confirm-promo-head modal-flex-between-gap-12 modal-mb-10">
              <div className="reserve-confirm-promo-copy">
                <strong className="reserve-confirm-promo-title">Promo Voucher</strong>
                <p className="field-hint modal-m-0 reserve-confirm-promo-description">Apply a code from the super admin promotion list to lower the reservation total.</p>
                {hasAutoSale ? (
                  <p className="field-hint modal-m-0 reserve-confirm-promo-autosale">
                    Auto-applied sale: <strong>{autoSalePromotion?.name || "Sale Promo"}</strong>
                  </p>
                ) : null}
              </div>
              {appliedPromotion ? (
                <span className="order-status-chip status-paid reserve-confirm-promo-status">Applied</span>
              ) : hasAutoSale ? (
                <span className="order-status-chip status-paid reserve-confirm-promo-status">Sale Auto Applied</span>
              ) : null}
            </div>
            <div className="modal-flex-gap-8-wrap">
              <input
                value={promoCode}
                onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                maxLength={40}
                className="modal-input-grow-220 modal-uppercase"
              />
              <button
                type="button"
                className="button-secondary"
                onClick={onApplyPromo}
                disabled={isApplyingPromo}
              >
                {isApplyingPromo ? "Checking..." : "Apply Voucher"}
              </button>
            </div>
            {promoMessage ? (
              <p className="field-hint modal-hint-top-8-bottom-0">{promoMessage}</p>
            ) : hasAutoSale ? (
              <p className="field-hint modal-hint-top-8-bottom-0">Sale discount is already applied automatically. Voucher is optional if you have one.</p>
            ) : (
              <p className="field-hint modal-hint-top-8-bottom-0">You can still confirm with a voucher code typed here — we will validate it on submit if needed.</p>
            )}
          </div>

          <div className="reserve-confirm-total-panel modal-card-gradient">
            <div className="modal-grid-gap-8">
              <div className="modal-flex-between-gap-12">
                <span className="field-hint">Subtotal</span>
                <strong>{PHP_CURRENCY.format(estimatedReservationValue)}</strong>
              </div>
              {appliedPromotion ? (
                <div className="modal-flex-between-gap-12">
                  <span className="field-hint">Promo Discount</span>
                  <strong className="modal-text-teal">- {PHP_CURRENCY.format(promoAppliedDiscount)}</strong>
                </div>
              ) : hasAutoSale ? (
                <div className="modal-flex-between-gap-12">
                  <span className="field-hint">Sale Discount</span>
                  <strong className="modal-text-teal">- {PHP_CURRENCY.format(promoAppliedDiscount)}</strong>
                </div>
              ) : null}
              <div className="modal-flex-between-gap-12 modal-top-divider-dashed">
                <span className="field-hint"><strong>Total Due</strong></span>
                <strong>{PHP_CURRENCY.format(promoAppliedTotal)}</strong>
              </div>
            </div>
          </div>
          <p className="field-hint modal-hint-top-10">
            Sole Reax will contact you once the item is ship.
          </p>
        </div>

        <div className="reserve-confirm-actions modal-sticky-footer">
          <button
            type="button"
            className="btn-cancel reserve-confirm-cancel-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Edit Details
          </button>
          <button
            type="button"
            className="btn-primary reserve-confirm-submit-btn"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Confirm Reservation"}
          </button>
        </div>
      </section>
    </div>
  );
}

