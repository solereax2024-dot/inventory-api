import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

export default function NewBrandModal({
  newBrandModal,
  setNewBrandModal,
  addNewBrand,
  savedBrands,
  deleteSavedBrand,
  uploadBrandLogo
}) {
  const [pendingDelete, setPendingDelete] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (!newBrandModal.isOpen) {
      setPendingDelete("");
      setUploadingId(null);
    }
  }, [newBrandModal.isOpen]);

  if (!newBrandModal.isOpen) return null;

  const handleLogoChange = async (brand, file) => {
    if (!file) return;
    setUploadingId(brand.id);
    try {
      await uploadBrandLogo(brand.id, file);
    } finally {
      setUploadingId(null);
    }
  };

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
                <div className="saved-entry-item brand-entry-item" key={brand.id ?? brand.name}>
                  <div className="brand-entry-logo-col">
                    <div
                      className="brand-entry-logo"
                      title="Click to upload logo"
                      onClick={() => fileInputRefs.current[brand.id]?.click()}
                      style={{ cursor: "pointer" }}
                    >
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.name} className="brand-logo-img" />
                      ) : (
                        <span className="brand-logo-placeholder">
                          <ImagePlus size={16} />
                        </span>
                      )}
                      {uploadingId === brand.id && (
                        <span className="brand-logo-uploading">•••</span>
                      )}
                    </div>
                    <input
                      ref={(el) => { fileInputRefs.current[brand.id] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleLogoChange(brand, e.target.files?.[0])}
                    />
                  </div>
                  <span className="brand-entry-name">{brand.name}</span>
                  {pendingDelete === brand.name ? (
                    <div className="saved-entry-confirm-actions">
                      <button
                        type="button"
                        className="saved-entry-confirm-btn"
                        onClick={() => {
                          deleteSavedBrand(brand.name).catch(() => undefined);
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
                      onClick={() => setPendingDelete(brand.name)}
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
