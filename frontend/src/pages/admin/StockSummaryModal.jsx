import ConfirmActionModal from "./ConfirmActionModal";
import { formatColorwayLabel } from "../../utils/format";
import { isUnisexDepartment } from "../../utils/sizePresentation";
import { toCustomerPriceFromSupplier } from "../../utils/price";

const SUPPLIER_BADGE_PALETTE = [
  { bg: "#eef2ff", border: "#c7d2fe", text: "#3730a3", activeBg: "#dbeafe" },
  { bg: "#ecfeff", border: "#a5f3fc", text: "#155e75", activeBg: "#cffafe" },
  { bg: "#ecfdf5", border: "#a7f3d0", text: "#166534", activeBg: "#d1fae5" },
  { bg: "#fff7ed", border: "#fdba74", text: "#9a3412", activeBg: "#ffedd5" },
  { bg: "#fdf2f8", border: "#f9a8d4", text: "#9d174d", activeBg: "#fce7f3" },
  { bg: "#f5f3ff", border: "#c4b5fd", text: "#6d28d9", activeBg: "#ede9fe" }
];

function getSupplierPalette(supplier = "") {
  const normalized = String(supplier || "").trim().toLowerCase() || "no-supplier";
  const hash = [...normalized].reduce((total, character) => total + character.charCodeAt(0), 0);
  return SUPPLIER_BADGE_PALETTE[hash % SUPPLIER_BADGE_PALETTE.length];
}

function getSupplierBadgeStyle(supplier, isActive = false) {
  const palette = getSupplierPalette(supplier);
  return {
    "--supplier-badge-bg": isActive ? palette.activeBg : palette.bg,
    "--supplier-badge-border": palette.border,
    "--supplier-badge-color": palette.text
  };
}

function getSupplierLabel(supplier) {
  return supplier || "No supplier";
}

export default function StockSummaryModal({
  isOpen,
  onClose,
  productName,
  colorway,
  colorwayOptions,
  onColorwayChange,
  stockModalDepartment,
  activeStockSizeGroup,
  stockSizeSections,
  onSizeGroupChange,
  bulkAction,
  onBulkFieldChange,
  onQuantityDecrement,
  onQuantityIncrement,
  onApply,
  onClear,
  onResetClick,
  selectedRows,
  supplierSelections,
  onSupplierSelectionChange,
  sortedRows,
  sortColumn,
  sortAsc,
  onSortChange,
  onToggleAllRows,
  onToggleRow,
  visibleTotals,
  resetModal,
  onResetCancel,
  onResetConfirm,
  formatPriceLabel,
  customerMarkup,
  hasSizeGuide,
  onOpenSizeGuide,
  supplierSuggestions = []
}) {
  if (!isOpen) return null;

  const selectedCount = selectedRows.size;
  const showSizeGroup = isUnisexDepartment(stockModalDepartment);
  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedRows.has(`${activeStockSizeGroup}-${row.baseSize}`));
  const parsedMarkup = Number(bulkAction.markup);
  const activeMarkup = Number.isFinite(parsedMarkup) && parsedMarkup >= 0 ? parsedMarkup : customerMarkup;
  const supplierDatalistId = "stock-summary-supplier-options";

  const sortLabel = (column) => (sortColumn === column ? (sortAsc ? "↑" : "↓") : "");
  const renderSupplierContent = (rowKey, supplierBreakdownEntries, selectedSupplierEntry, selectedSupplier) => {
    if (supplierBreakdownEntries.length > 1) {
      return (
        <div className="stock-summary-supplier-stack">
          <div className="stock-summary-supplier-select-wrap">
            <select
              value={selectedSupplier}
              onChange={(e) => onSupplierSelectionChange(rowKey, e.target.value)}
              disabled={bulkAction.applying}
              className="stock-summary-supplier-select"
              title="Select supplier batch"
            >
              {supplierBreakdownEntries.map((entry) => (
                <option key={`${rowKey}-${entry.supplier || "no-supplier"}`} value={entry.supplier || ""}>
                  {getSupplierLabel(entry.supplier)} · Qty {entry.quantity}
                </option>
              ))}
            </select>
            <small className="stock-summary-supplier-meta">
              Holding {selectedSupplierEntry?.quantity ?? 0} stock · {supplierBreakdownEntries.length} suppliers
            </small>
          </div>
        </div>
      );
    }

    if (selectedSupplierEntry) {
      return (
        <span
          className="stock-supplier-chip stock-supplier-chip-single"
          style={getSupplierBadgeStyle(selectedSupplierEntry.supplier, true)}
          title={`${getSupplierLabel(selectedSupplierEntry.supplier)} holds ${selectedSupplierEntry.quantity} stock`}
        >
          <span className="stock-supplier-chip-label">{getSupplierLabel(selectedSupplierEntry.supplier)}</span>
          <strong className="stock-supplier-chip-qty">Qty {selectedSupplierEntry.quantity}</strong>
        </span>
      );
    }

    return <span className="stock-supplier-chip muted">-</span>;
  };

  return (
    <>
      <div className="modal-backdrop stock-summary-overlay" onClick={onClose}>
        <section className="modal-panel stock-summary-modal" onClick={(e) => e.stopPropagation()}>
          <div className="breakdown-header stock-summary-header">
            <div className="stock-summary-header-main">
              <div className="stock-summary-title-row">
                <div>
                  <h2 className="stock-summary-title">Stock Summary</h2>
                  <p className="stock-summary-helper stock-summary-title-subtext">
                    {productName ? `${productName} • ` : ""}
                    {selectedCount > 0 ? `${selectedCount} selected • ` : ""}
                    Update only the fields you fill in.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close stock summary"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <section className="edit-modal-section create-modal-section stock-summary-form-section">
            <h3>Bulk Update</h3>
            <p className="field-hint stock-summary-form-hint">Match this with your Add Product workflow, then apply to selected sizes. Customer price = supplier price + markup.</p>

            <div className="stock-summary-controls-grid">
              <div className="stock-summary-field stock-field stock-summary-field-colorway">
                <label className="stock-summary-field-label stock-field-label">Colorway</label>
                <select
                  value={colorway}
                  onChange={(e) => onColorwayChange(e.target.value)}
                  disabled={bulkAction.applying}
                  className="stock-summary-field-input"
                >
                  {colorwayOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatColorwayLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              {showSizeGroup ? (
                <div className="stock-summary-field stock-field stock-summary-field-size-group">
                  <label className="stock-summary-field-label stock-field-label">Size Group</label>
                  <select
                    value={activeStockSizeGroup}
                    onChange={(e) => onSizeGroupChange(e.target.value)}
                    disabled={bulkAction.applying}
                    className="stock-summary-field-input"
                  >
                    {stockSizeSections.map((section) => (
                      <option key={`stock-group-${section.key}`} value={section.key}>
                        {section.key === "WOMEN" ? "Women's" : "Men's"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {hasSizeGuide ? (
                <div className="stock-summary-field stock-field stock-summary-field-size-guide">
                  <label className="stock-summary-field-label stock-field-label">Size Guide</label>
                  <button
                    type="button"
                    className="size-guide-pill-btn stock-summary-size-guide-btn"
                    onClick={onOpenSizeGuide}
                    disabled={bulkAction.applying}
                  >
                    📏 Open Guide
                  </button>
                </div>
              ) : null}

              <div className="stock-summary-field stock-field stock-summary-field-stock-type">
                <label className="stock-summary-field-label stock-field-label">Stock Type</label>
                <select
                  value={bulkAction.quantityMode}
                  onChange={(e) => onBulkFieldChange("quantityMode", e.target.value)}
                  disabled={bulkAction.applying}
                  className="stock-summary-field-input"
                >
                  <option value="ADD">Add</option>
                  <option value="REMOVE">Remove</option>
                </select>
              </div>

              <div className="stock-summary-field stock-field stock-summary-field-wide stock-summary-field-supplier">
                <label className="stock-summary-field-label stock-field-label">Supplier</label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Supplier name"
                  list={supplierDatalistId}
                  value={bulkAction.supplier}
                  onChange={(e) => onBulkFieldChange("supplier", e.target.value)}
                  disabled={bulkAction.applying}
                  className="stock-summary-field-input"
                />
                <datalist id={supplierDatalistId}>
                  {supplierSuggestions.map((supplier) => (
                    <option key={`supplier-option-${supplier}`} value={supplier} />
                  ))}
                </datalist>
              </div>

              <div className="stock-summary-field stock-field stock-summary-field-price">
                    <label className="stock-summary-field-label stock-field-label">Supplier Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                      placeholder="Supplier price (PHP)"
                  value={bulkAction.price}
                  onChange={(e) => onBulkFieldChange("price", e.target.value)}
                  disabled={bulkAction.applying}
                  className="stock-summary-field-input"
                />
              </div>

                  <div className="stock-summary-field stock-field stock-summary-field-markup">
                    <label className="stock-summary-field-label stock-field-label">Markup</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`Markup (default ${formatPriceLabel(customerMarkup)})`}
                      value={bulkAction.markup}
                      onChange={(e) => onBulkFieldChange("markup", e.target.value)}
                      disabled={bulkAction.applying}
                      className="stock-summary-field-input"
                    />
                  </div>

              <div className="stock-summary-field stock-field stock-summary-field-quantity">
                <label className="stock-summary-field-label stock-field-label">Quantity</label>
                <div className="stock-summary-qty-group">
                  <button
                    type="button"
                    onClick={onQuantityDecrement}
                    disabled={bulkAction.applying}
                    className="stock-summary-qty-btn"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    value={bulkAction.quantityChange}
                    onChange={(e) => onBulkFieldChange("quantityChange", e.target.value)}
                    disabled={bulkAction.applying}
                    className="stock-summary-field-input stock-summary-qty-input"
                  />
                  <button
                    type="button"
                    onClick={onQuantityIncrement}
                    disabled={bulkAction.applying}
                    className="stock-summary-qty-btn"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="stock-summary-bulk-actions">
            <div className="stock-summary-toolbar">
              <p className="stock-summary-helper stock-summary-toolbar-note">
                Choose sizes below, then apply quantity, supplier, or price changes in one go. For sizes with multiple suppliers, use the dropdown in the Supplier column to target the batch you want to inspect or update.
              </p>
              <div className="stock-summary-action-group create-product-actions-row">
                <button
                  type="button"
                  onClick={onApply}
                  disabled={bulkAction.applying || selectedCount === 0}
                  className="stock-summary-action-btn stock-summary-apply-btn create-product-save-btn"
                >
                  {bulkAction.applying ? "Applying..." : "Apply"}
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  disabled={bulkAction.applying}
                  className="stock-summary-action-btn stock-summary-clear-btn button-secondary"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={onResetClick}
                  disabled={bulkAction.applying || selectedCount === 0}
                  className="stock-summary-action-btn stock-summary-reset-btn button-secondary"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="modal-table-wrap">
            <table className="stock-summary-table">
              <thead>
                <tr>
                  <th style={{ width: "32px" }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => onToggleAllRows(e.target.checked)}
                      disabled={bulkAction.applying || sortedRows.length === 0}
                      title="Select all visible sizes"
                    />
                  </th>
                  <th onClick={() => onSortChange("size")} className="stock-header-sortable" title="Click to sort by size">
                    Size {sortLabel("size")}
                  </th>
                  <th onClick={() => onSortChange("total")} className="stock-header-sortable" title="Click to sort by stock quantity">
                    Stock {sortLabel("total")}
                  </th>
                  <th onClick={() => onSortChange("supplier")} className="stock-header-sortable" title="Click to sort by supplier">
                    Supplier {sortLabel("supplier")}
                  </th>
                  <th onClick={() => onSortChange("price")} className="stock-header-sortable" title="Click to sort by supplier price">
                    Supplier Price {sortLabel("price")}
                  </th>
                  <th>
                    Customer
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No sizes match the selected filters.</td>
                  </tr>
                ) : (
                  sortedRows.map((row) => {
                    const rowKey = `${activeStockSizeGroup}-${row.baseSize}`;
                    const isSelected = selectedRows.has(rowKey);
                    const supplierEntries = Array.isArray(row.supplierEntries) ? row.supplierEntries : [];
                    const supplierBreakdownEntries = supplierEntries.length > 0
                      ? supplierEntries
                      : (row.supplier || row.total > 0
                        ? [{ supplier: row.supplier || "", quantity: row.total, price: row.price, markup: row.markup }]
                        : []);
                    const selectedSupplier = supplierSelections?.[rowKey] ?? supplierEntries[0]?.supplier ?? row.supplier ?? "";
                    const selectedSupplierEntry = supplierBreakdownEntries.find((entry) => entry.supplier === selectedSupplier)
                      || supplierBreakdownEntries[0]
                      || null;
                    const displayedPrice = selectedSupplierEntry?.price ?? row.price;
                    const entryMarkup = selectedSupplierEntry?.markup ?? row.markup;
                    const appliedMarkup = Number.isFinite(Number(entryMarkup)) ? Number(entryMarkup) : activeMarkup;
                    const customerPrice = toCustomerPriceFromSupplier(displayedPrice, appliedMarkup);

                    return (
                      <tr key={`stock-summary-${activeStockSizeGroup}-${row.baseSize}`} className={isSelected ? "selected" : ""}>
                        <td style={{ width: "32px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onToggleRow(rowKey, e.target.checked)}
                            disabled={bulkAction.applying}
                          />
                        </td>
                        <td>US {row.displaySize}</td>
                        <td>
                          <span className={`stock-summary-total-pill ${row.total > 0 && row.total <= 3 ? "is-low" : ""}`}>
                            {row.total}
                          </span>
                        </td>
                        <td className="stock-cell-value">
                          {renderSupplierContent(rowKey, supplierBreakdownEntries, selectedSupplierEntry, selectedSupplier)}
                        </td>
                        <td className="stock-cell-value stock-summary-price-cell">
                          <span>{formatPriceLabel(displayedPrice)}</span>
                        </td>
                        <td className="stock-cell-value stock-summary-price-cell">
                          <span>{customerPrice === null ? "-" : formatPriceLabel(customerPrice)}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
                <tr>
                  <td />
                  <td><strong>Total</strong></td>
                  <td><strong>{visibleTotals.total}</strong></td>
                  <td>
                    <strong>—</strong>
                  </td>
                  <td><strong>-</strong></td>
                  <td><strong>-</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="stock-summary-mobile-actions">
            <button
              type="button"
              onClick={onApply}
              disabled={bulkAction.applying || selectedCount === 0}
              className="stock-summary-action-btn stock-summary-apply-btn create-product-save-btn"
            >
              {bulkAction.applying ? "Applying..." : "Apply"}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={bulkAction.applying}
              className="stock-summary-action-btn stock-summary-clear-btn button-secondary"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onResetClick}
              disabled={bulkAction.applying || selectedCount === 0}
              className="stock-summary-action-btn stock-summary-reset-btn button-secondary"
            >
              Reset
            </button>
          </div>
        </section>
      </div>

      <ConfirmActionModal
        isOpen={resetModal.isOpen}
        title="Reset Stock Data"
        description="This will reset quantity totals and clear supplier and price for all selected sizes in the active colorway. This cannot be undone."
        targetLabel={resetModal.count > 0
          ? `${resetModal.count} selected size${resetModal.count === 1 ? "" : "s"} · ${formatColorwayLabel(resetModal.colorway)}${resetModal.productName ? ` · ${resetModal.productName}` : ""}`
          : ""}
        confirmLabel={bulkAction.applying ? "Resetting..." : "Reset Selected"}
        onCancel={onResetCancel}
        onConfirm={onResetConfirm}
      />
    </>
  );
}

