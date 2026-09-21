import { X } from "lucide-react";

export default function QuickEditProductModal({
  isOpen,
  onClose,
  product,
  form,
  setForm,
  brandOptions,
  colorwayOptions,
  onSubmit,
  isSubmitting,
  onError,
  message
}) {
  if (!isOpen || !product) return null;

  const handleNameChange = (e) => {
    setForm({ ...form, name: e.target.value });
  };

  const handleBrandChange = (e) => {
    setForm({ ...form, brand: e.target.value });
  };

  const handleOldColorwayChange = (e) => {
    setForm({ ...form, oldColorway: e.target.value });
  };

  const handleNewColorwayChange = (e) => {
    setForm({ ...form, newColorway: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      onError("Product name cannot be empty.");
      return;
    }
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Quick Edit Product</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {message && (
            <div className="error-message" style={{ marginBottom: "16px" }}>
              {message}
            </div>
          )}

          <section style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "12px" }}>Product Name</h3>
            <input
              type="text"
              placeholder="Product name"
              value={form.name}
              onChange={handleNameChange}
              style={{ width: "100%" }}
            />
          </section>

          <section style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "12px" }}>Brand</h3>
            <select
              value={form.brand}
              onChange={handleBrandChange}
              style={{ width: "100%" }}
            >
              <option value="">Select Brand...</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
              Leave empty if not needed
            </small>
          </section>

          <section>
            <h3 style={{ marginBottom: "12px" }}>Rename Colorway (Optional)</h3>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "12px" }}>
              Leave blank to skip colorway rename
            </p>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                Current Colorway
              </label>
              <select
                value={form.oldColorway}
                onChange={handleOldColorwayChange}
                style={{ width: "100%" }}
              >
                <option value="">Select colorway to rename...</option>
                {colorwayOptions.map((colorway) => (
                  <option key={`old-${colorway}`} value={colorway}>
                    {colorway}
                  </option>
                ))}
              </select>
            </div>
            {form.oldColorway && (
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                  New Colorway Name
                </label>
                <input
                  type="text"
                  placeholder="New colorway name"
                  value={form.newColorway}
                  onChange={handleNewColorwayChange}
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

