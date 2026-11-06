export default function ReserveSuccessModal({
  isOpen,
  onClose,
  successReference,
  isReferenceCopied,
  hasConfirmedFacebookMessage,
  onToggleConfirmedFacebookMessage,
  requireFacebookConfirmation,
  onAttemptCloseBeforeConfirm,
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

  const isFacebookStepPending = requireFacebookConfirmation && !hasConfirmedFacebookMessage;
  const runProtectedAction = (callback) => {
    if (isFacebookStepPending) {
      onAttemptCloseBeforeConfirm();
      return;
    }
    callback();
  };

  return (
    <div className="modal-overlay" onClick={() => runProtectedAction(onClose)}>
      <section className="modal-panel reserve-success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reserve-success-content">
          <div className="reserve-success-icon" aria-hidden="true">✓</div>
          <h2>Reservation received</h2>
          {requireFacebookConfirmation ? (
            <p className="reserve-success-required-chip" role="status" aria-live="polite">
              Message us on Facebook to confirm faster while online payment is unavailable.
            </p>
          ) : null}
          <p className="reserve-success-copy">
            Please message Sole Reax now and include your reference code.
          </p>
          {successReference ? (
            <p className="reserve-success-ref">
              Reference: <strong>{successReference}</strong>
            </p>
          ) : null}
          <div className="reserve-success-primary-stack">
            <button
              type="button"
              className="btn-primary reserve-success-primary-btn reserve-success-facebook-btn"
              onClick={onNotifyFacebook}
              disabled={isPaymentRedirecting}
            >
              Open Facebook Messenger
            </button>
            {successReference ? (
              <button
                type="button"
                className="btn-cancel reserve-success-secondary-btn reserve-success-copy-btn"
                onClick={onCopyReference}
                disabled={isPaymentRedirecting}
              >
                {isReferenceCopied ? "Reference Copied" : "Copy Reference"}
              </button>
            ) : null}
          </div>
          <label className="reserve-success-confirm-check">
            <input
              type="checkbox"
              checked={hasConfirmedFacebookMessage}
              onChange={(e) => onToggleConfirmedFacebookMessage(e.target.checked)}
              disabled={isPaymentRedirecting}
            />
            <span>I already sent my Facebook message.</span>
          </label>
          <div className="reserve-success-actions modal-sticky-footer">
            <button
              type="button"
              className="btn-cancel reserve-success-secondary-btn"
              onClick={() => runProtectedAction(onReserveAnother)}
              disabled={isPaymentRedirecting}
            >
              Reserve Another
            </button>
            <button
              type="button"
              className="btn-cancel reserve-success-secondary-btn"
              onClick={() => runProtectedAction(onBackToCollections)}
              disabled={isPaymentRedirecting}
            >
              Back to Collections
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
          </div>
        </div>
      </section>
    </div>
  );
}

