export default function AdminSuccessModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>Success</h2>
          <button type="button" className="modal-close-btn" aria-label="Close success modal" onClick={onClose}>✕</button>
        </div>
        <div className="modal-success-content">
          <p className="modal-success-message">{message}</p>
          <div className="modal-actions-center">
            <button type="button" onClick={onClose} className="modal-btn-minw-120">OK</button>
          </div>
        </div>
      </section>
    </div>
  );
}

