import { Boxes, Trash2 } from "lucide-react";

export default function AdminProductsTableBody({
  products,
  isLoading,
  isSuperAdmin,
  resolveSelectedColorway,
  onEditProduct,
  onManageStock,
  onDeleteProduct
}) {
  return (
    <tbody>
      {products.map((product) => {
        if (isLoading) {
          return (
            <tr key={product.id}>
              <td colSpan="3"><div className="skeleton-line" /></td>
            </tr>
          );
        }

        const selectedColorway = resolveSelectedColorway(product);

        return (
          <tr
            key={product.id}
            className="clickable-product-row"
            onClick={() => onEditProduct(product.id, selectedColorway)}
          >
            <td>{product.name}</td>
            <td>{product.brand}</td>
            <td>
              <div className="actions-inline admin-actions-inline">
                <button
                  type="button"
                  className="admin-action-btn quick-tooltip"
                  data-tooltip="Manage Stock"
                  aria-label="Manage stock"
                  onClick={(event) => {
                    event.stopPropagation();
                    onManageStock(product.id, selectedColorway);
                  }}
                >
                  <Boxes size={15} />
                  <span className="admin-action-label">Manage Stock</span>
                </button>
                {isSuperAdmin ? (
                  <button
                    type="button"
                    className="btn-delete admin-action-btn quick-tooltip"
                    data-tooltip="Delete"
                    aria-label="Delete product"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteProduct(product.id);
                    }}
                  >
                    <Trash2 size={15} />
                    <span className="admin-action-label">Delete</span>
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

