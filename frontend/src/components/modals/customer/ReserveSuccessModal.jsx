export default function ReserveSuccessModal({
  isOpen,
  onClose,
  successReference,
  isReferenceCopied,
  onReserveAnother,
  onCopyReference,
  onNotifyFacebook,
  enableOnlinePayment,
  onPayment,
  successOrderId,
  isPaymentRedirecting,
  onBackToCollections
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-panel reserve-success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reserve-success-content">
          <div className="reserve-success-icon" aria-hidden="true">✓</div>
          <h2>Reservation sent</h2>
          <p className="reserve-success-copy">
            Thanks! We received your reservation request. Optional: notify the Sole Reax Facebook page about your order for faster assistance.
          </p>
          {successReference ? (
            <p className="reserve-success-ref">
              Reference: <strong>{successReference}</strong>
            </p>
          ) : null}
          {successReference ? (
            <button
              type="button"
              className="btn-cancel reserve-success-secondary-btn"
              onClick={onCopyReference}
              disabled={isPaymentRedirecting}
            >
              {isReferenceCopied ? "Reference Copied" : "Copy Reference"}
            </button>
          ) : null}
          <p className="field-hint modal-m-0">
            Send this reference when you message them on Facebook.
          </p>
          <div className="reserve-success-actions modal-sticky-footer">
            <button
              type="button"
              className="btn-primary reserve-success-primary-btn"
              onClick={onNotifyFacebook}
              disabled={isPaymentRedirecting}
            >
              Notify on Facebook
            </button>
            <button
              type="button"
              className="btn-cancel reserve-success-secondary-btn"
              onClick={onReserveAnother}
              disabled={isPaymentRedirecting}
            >
              Reserve Another
            </button>
            {enableOnlinePayment ? (
              <button
                type="button"
                className="btn-primary reserve-success-primary-btn"
                onClick={onPayment}
                disabled={!successOrderId || isPaymentRedirecting}
              >
                {isPaymentRedirecting ? "Redirecting..." : "Pay Online (GCash/Maya/Banks)"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-cancel reserve-success-secondary-btn"
                disabled
                title="Online payment is coming soon"
              >
                Pay Online (Soon)
              </button>
            )}
            <button
              type="button"
              className="btn-cancel reserve-success-secondary-btn"
              onClick={onBackToCollections}
              disabled={isPaymentRedirecting}
            >
              Back to Collections
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

