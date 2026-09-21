import { Edit2 } from "lucide-react";

export default function AdminProductsTableQuickEditButton({
  product,
  onQuickEdit
}) {
  return (
    <button
      type="button"
      className="admin-action-btn quick-tooltip"
      data-tooltip="Quick Edit"
      aria-label="Quick edit product"
      onClick={(event) => {
        event.stopPropagation();
        onQuickEdit(product.id, product);
      }}
    >
      <Edit2 size={15} />
      <span className="admin-action-label">Quick Edit</span>
    </button>
  );
}

