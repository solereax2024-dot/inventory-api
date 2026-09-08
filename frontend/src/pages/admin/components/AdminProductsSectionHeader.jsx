import { PlusCircle } from "lucide-react";

export default function AdminProductsSectionHeader({ adminRole, onAddProduct }) {
  return (
    <div className="section-head">
      <h2>Products</h2>
      <p className="field-hint" style={{ margin: 0 }}>
        Role: <strong>{adminRole || "ADMIN"}</strong>
      </p>
      <button type="button" className="btn-primary" onClick={onAddProduct}>
        <PlusCircle size={16} />
        <span>Add Product</span>
      </button>
    </div>
  );
}

