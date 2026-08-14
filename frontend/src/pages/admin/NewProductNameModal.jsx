export default function NewProductNameModal({ newProductNameModal, setNewProductNameModal, addNewProductName }) {
  if (!newProductNameModal.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setNewProductNameModal({ isOpen: false, productName: "" })}>
      <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>Add Product Name</h2>
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
      </section>
    </div>
  );
}
