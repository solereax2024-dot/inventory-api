export default function ConfirmActionModal({
  isOpen,
  title,
  description,
  targetLabel,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <section className="modal-panel modal-panel-compact confirm-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-action-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close-btn" onClick={onCancel} aria-label="Close confirmation modal">
            ✕
          </button>
        </div>

        <p className="confirm-action-copy">{description}</p>
        {targetLabel ? <p className="confirm-action-target">{targetLabel}</p> : null}

        <div className="confirm-action-footer">
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="confirm-action-danger-btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

