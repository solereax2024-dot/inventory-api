export default function ReserveSuccessModal({
  isOpen,
  successReference,
  onNotifyFacebook,
  onBackToCollections
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onBackToCollections}>
      <section className="modal-panel reserve-success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reserve-success-content">
          <div className="reserve-success-icon" aria-hidden="true">✓</div>
          <h2>Reservation received</h2>
          <p className="reserve-success-required-chip" role="status" aria-live="polite">
            For faster transaction, notify our Facebook page about your order.
          </p>
          <p className="reserve-success-copy">Please message Sole Reax now and include your reference code.</p>
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
            >
              Notify Facebook Page
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

