export default function ProductActionModalShell({
  isOpen,
  title,
  onClose,
  message,
  children
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header stock-summary-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
        <p className="message">{message}</p>
      </section>
    </div>
  );
}

