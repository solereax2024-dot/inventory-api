export default function DeleteModal({ deleteModal, setDeleteModal, confirmDelete }) {
  if (!deleteModal.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setDeleteModal({ isOpen: false, productId: null, confirmCode: "", userInput: "" })}>
      <section className="modal-panel delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <h2>Delete Product</h2>
          <button className="close-btn" onClick={() => setDeleteModal({ isOpen: false, productId: null, confirmCode: "", userInput: "" })}>×</button>
        </div>

        <div className="delete-modal-body">
          <div className="warning-box">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <p><strong>This action cannot be undone.</strong></p>
              <p>This will permanently delete the product and all its colorways, stock records, and related data.</p>
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
              onClick={() => setDeleteModal({ isOpen: false, productId: null, confirmCode: "", userInput: "" })}
            >
              Cancel
            </button>
            <button
              className="btn-delete-confirm"
              onClick={confirmDelete}
              disabled={deleteModal.userInput !== deleteModal.confirmCode}
            >
              Delete Product
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
