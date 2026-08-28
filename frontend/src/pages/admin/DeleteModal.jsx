const DEFAULT_CLOSED_STATE = { isOpen: false, productId: null, confirmCode: "", userInput: "" };

export default function DeleteModal({
  deleteModal,
  setDeleteModal,
  confirmDelete,
  title = "Delete Product",
  description = "This will permanently delete the product and all its colorways, stock records, and related data.",
  confirmLabel = "Delete Product",
  closedState = DEFAULT_CLOSED_STATE
}) {
  if (!deleteModal.isOpen) return null;

  const closeModal = () => setDeleteModal(closedState);

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <section className="modal-panel delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={closeModal}>×</button>
        </div>

        <div className="delete-modal-body">
          <div className="warning-box">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <p><strong>This action cannot be undone.</strong></p>
              <p>{description}</p>
            </div>
          </div>

          <div className="confirm-code-section">
            <p className="confirm-instruction">To confirm deletion, enter the code below:</p>
            <div className="confirm-code-display">{deleteModal.confirmCode}</div>

            <input
              type="text"
              className="confirm-code-input"
              placeholder="Enter the code here"
              value={deleteModal.userInput}
              onChange={(e) => setDeleteModal({ ...deleteModal, userInput: e.target.value.toUpperCase() })}
              autoFocus
            />
          </div>

          <div className="delete-modal-footer">
            <button
              className="btn-cancel"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="btn-delete-confirm"
              onClick={confirmDelete}
              disabled={deleteModal.userInput !== deleteModal.confirmCode}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
