import AdminProductsPagination from "./AdminProductsPagination.jsx";
import AdminProductsSectionHeader from "./AdminProductsSectionHeader.jsx";
import AdminProductsTableBody from "./AdminProductsTableBody.jsx";
import AdminProductsTableFilters from "./AdminProductsTableFilters.jsx";

export default function AdminProductsSection({
  adminRole,
  tableFilters,
  brandOptions,
  isLoading,
  paginatedProducts,
  currentPage,
  totalPages,
  paginationItems,
  isSuperAdmin,
  resolveSelectedColorway,
  onProductFilterChange,
  onAddProduct,
  onEditProduct,
  onManageStock,
  onDeleteProduct,
  onPageChange
}) {
  const rows = isLoading
    ? Array.from({ length: 6 }, (_, index) => ({ id: `loading-${index}` }))
    : paginatedProducts;

  return (
    <section className="card products-card admin-section">
      <AdminProductsSectionHeader adminRole={adminRole} onAddProduct={onAddProduct} />
      <div className="products-table-wrap">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Actions</th>
            </tr>
            <AdminProductsTableFilters
              tableFilters={tableFilters}
              brandOptions={brandOptions}
              onProductFilterChange={onProductFilterChange}
            />
          </thead>
          <AdminProductsTableBody
            products={rows}
            isLoading={isLoading}
            isSuperAdmin={isSuperAdmin}
            resolveSelectedColorway={resolveSelectedColorway}
            onEditProduct={onEditProduct}
            onManageStock={onManageStock}
            onDeleteProduct={onDeleteProduct}
          />
        </table>
      </div>
      <AdminProductsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        paginationItems={paginationItems}
        onPageChange={onPageChange}
      />
    </section>
  );
}

