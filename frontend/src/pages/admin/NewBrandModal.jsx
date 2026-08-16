import { useEffect, useState } from "react";

export default function NewBrandModal({
  newBrandModal,
  setNewBrandModal,
  addNewBrand,
  savedBrands,
  deleteSavedBrand
}) {
  const [pendingDelete, setPendingDelete] = useState("");

  useEffect(() => {
    if (!newBrandModal.isOpen) {
      setPendingDelete("");
    }
  }, [newBrandModal.isOpen]);

  if (!newBrandModal.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setNewBrandModal({ isOpen: false, brandName: "" })}>
      <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>Manage Brands</h2>
          <button type="button" className="modal-close-btn" onClick={() => setNewBrandModal({ isOpen: false, brandName: "" })}>
            ✕
          </button>
        </div>
        <input
          type="text"
          placeholder="Brand name (e.g., Nike, Adidas, New Balance)"
          value={newBrandModal.brandName}
          onChange={(e) => setNewBrandModal({ ...newBrandModal, brandName: e.target.value })}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              addNewBrand();
            }
          }}
          autoFocus
          style={{ marginBottom: "16px" }}
        />
        <button type="button" className="btn-primary" onClick={addNewBrand}>
          Add Brand
        </button>

        <div className="saved-entry-list">
          <p className="saved-entry-title">Saved brands</p>
          {savedBrands.length > 0 ? (
            <div className="saved-entry-items">
              {savedBrands.map((brand) => (
                <div className="saved-entry-item" key={brand}>
                  <span>{brand}</span>
                  {pendingDelete === brand ? (
                    <div className="saved-entry-confirm-actions">
                      <button
                        type="button"
                        className="saved-entry-confirm-btn"
                        onClick={() => {
                          deleteSavedBrand(brand).catch(() => undefined);
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
                      onClick={() => setPendingDelete(brand)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="field-hint">No saved brands to delete.</p>
          )}
        </div>
      </section>
    </div>
  );
}
