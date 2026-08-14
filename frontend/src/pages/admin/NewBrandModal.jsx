export default function NewBrandModal({ newBrandModal, setNewBrandModal, addNewBrand }) {
  if (!newBrandModal.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setNewBrandModal({ isOpen: false, brandName: "" })}>
      <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>Add New Brand</h2>
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
      </section>
    </div>
  );
}
