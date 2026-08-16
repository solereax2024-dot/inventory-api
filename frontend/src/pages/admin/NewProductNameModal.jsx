import { useEffect, useState } from "react";

export default function NewProductNameModal({
  newProductNameModal,
  setNewProductNameModal,
  addNewProductName,
  savedProductNames,
  deleteSavedProductName
}) {
  const [pendingDelete, setPendingDelete] = useState("");

  useEffect(() => {
    if (!newProductNameModal.isOpen) {
      setPendingDelete("");
    }
  }, [newProductNameModal.isOpen]);

  if (!newProductNameModal.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setNewProductNameModal({ isOpen: false, productName: "" })}>
      <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>Manage Product Names</h2>
          <button type="button" className="modal-close-btn" onClick={() => setNewProductNameModal({ isOpen: false, productName: "" })}>
            ✕
          </button>
        </div>
        <input
          type="text"
          placeholder="Product name (e.g., Air Force 1, Mexico 66)"
          value={newProductNameModal.productName}
          onChange={(e) => setNewProductNameModal({ ...newProductNameModal, productName: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addNewProductName();
            }
          }}
          autoFocus
          style={{ marginBottom: "16px" }}
        />
        <button type="button" className="btn-primary" onClick={addNewProductName}>
          Add Name
        </button>

        <div className="saved-entry-list">
          <p className="saved-entry-title">Saved product names</p>
          {savedProductNames.length > 0 ? (
            <div className="saved-entry-items">
              {savedProductNames.map((name) => (
                <div className="saved-entry-item" key={name}>
                  <span>{name}</span>
                  {pendingDelete === name ? (
                    <div className="saved-entry-confirm-actions">
                      <button
                        type="button"
                        className="saved-entry-confirm-btn"
                        onClick={() => {
                          deleteSavedProductName(name).catch(() => undefined);
                          setPendingDelete("");
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="saved-entry-cancel-btn"
                        onClick={() => setPendingDelete("")}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="saved-entry-delete-btn"
                      onClick={() => setPendingDelete(name)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="field-hint">No saved product names to delete.</p>
          )}
        </div>
      </section>
    </div>
  );
}
