import { useMemo } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { RESERVATION_MOP_OPTIONS, US_SIZES } from "../../../constants";
import { normalizeColorwayValue } from "../../../utils/colorway";
import { formatColorwayLabel, formatEnumLabel } from "../../../utils/format";
import { getProductColorways } from "../../../utils/productFormHelpers";
import {
  buildSizeSections,
  formatSelectedSizeLabel,
  getDefaultSizeGroup,
  getDepartmentForColorway,
  isUnisexDepartment
} from "../../../utils/sizePresentation";
import ProductActionModalShell from "./ProductActionModalShell";

function sortProducts(products = []) {
  return [...products].sort((left, right) => {
    const leftLabel = `${left?.brand || ""} ${left?.name || ""}`.trim();
    const rightLabel = `${right?.brand || ""} ${right?.name || ""}`.trim();
    return leftLabel.localeCompare(rightLabel);
  });
}

function getAvailableProducts(products = []) {
  return sortProducts(products.filter((product) => product?.active !== false));
}

function buildNormalizedItem(item, availableProducts) {
  const fallbackProduct = availableProducts[0] || null;
  const product = availableProducts.find((candidate) => String(candidate.id) === String(item?.productId || "")) || fallbackProduct;
  const productId = product?.id ? String(product.id) : "";
  const colorways = product ? getProductColorways(product) : ["DEFAULT"];
  const requestedColorway = normalizeColorwayValue(item?.colorway || product?.mainColor || colorways[0] || "DEFAULT");
  const colorway = colorways.includes(requestedColorway) ? requestedColorway : (colorways[0] || "DEFAULT");
  const department = getDepartmentForColorway(product, colorway);
  const sizeSections = product ? buildSizeSections(product, colorway) : [];
  const fallbackSizeGroup = sizeSections[0]?.key || getDefaultSizeGroup(department);
  const requestedSizeGroup = String(item?.sizeGroup || "").toUpperCase();
  const sizeGroup = isUnisexDepartment(department)
    ? (requestedSizeGroup === "WOMEN" ? "WOMEN" : "MEN")
    : fallbackSizeGroup;
  const activeSizeSection = sizeSections.find((section) => section.key === sizeGroup) || sizeSections[0] || null;
  const requestedSize = String(item?.size || "").trim();
  const size = activeSizeSection?.rows?.some((row) => row.baseSize === requestedSize)
    ? requestedSize
    : (activeSizeSection?.rows?.find((row) => row.total > 0)?.baseSize || activeSizeSection?.rows?.[0]?.baseSize || US_SIZES[0]);
  const quantity = String(item?.quantity ?? "1").trim() || "1";

  return {
    productId,
    colorway,
    sizeGroup,
    size,
    quantity
  };
}

function buildReservationPayload(form, availableProducts) {
  if (availableProducts.length === 0) {
    throw new Error("Add an active product first before creating a reservation.");
  }
  if (!form.customerName?.trim()) {
    throw new Error("Please enter the customer name.");
  }
  if (!form.customerContact?.trim()) {
    throw new Error("Please enter the customer contact.");
  }
  if (!form.mop?.trim()) {
    throw new Error("Please select a payment method.");
  }
  if (form.mop === "OTHER" && !form.mopOther?.trim()) {
    throw new Error("Please specify the payment method.");
  }

  const sourceItems = Array.isArray(form.items) && form.items.length > 0 ? form.items : [{}];
  const items = sourceItems.map((item, index) => {
    const normalizedItem = buildNormalizedItem(item, availableProducts);
    const product = availableProducts.find((candidate) => String(candidate.id) === normalizedItem.productId);
    if (!product?.id) {
      throw new Error(`Please select a valid product for item ${index + 1}.`);
    }

    const quantity = Number(normalizedItem.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Quantity for item ${index + 1} must be at least 1.`);
    }

    const department = getDepartmentForColorway(product, normalizedItem.colorway);
    const sizeSections = buildSizeSections(product, normalizedItem.colorway);
    const activeSizeGroup = isUnisexDepartment(department)
      ? (normalizedItem.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
      : (sizeSections[0]?.key || getDefaultSizeGroup(department));
    const activeSizeSection = sizeSections.find((section) => section.key === activeSizeGroup) || sizeSections[0] || null;
    const selectedSizeRow = activeSizeSection?.rows?.find((row) => row.baseSize === normalizedItem.size) || null;

    if (!selectedSizeRow) {
      throw new Error(`Please choose a valid size for item ${index + 1}.`);
    }

    const availableQuantity = Number(selectedSizeRow.total || 0);
    if (availableQuantity > 0 && quantity > availableQuantity) {
      throw new Error(`Only ${availableQuantity} pair(s) on hand for item ${index + 1}. Reduce the quantity or choose another size.`);
    }

    return {
      productId: Number(product.id),
      colorway: normalizedItem.colorway,
      size: normalizedItem.size,
      sizeGroup: activeSizeGroup,
      quantity
    };
  });

  return {
    customerName: form.customerName.trim(),
    customerContact: form.customerContact.trim(),
    notes: form.notes?.trim() || "",
    mop: form.mop,
    mopOther: form.mop === "OTHER" ? form.mopOther.trim() : "",
    promoCode: form.promoCode?.trim().toUpperCase() || "",
    items
  };
}

export default function ManualReservationModal({
  isOpen,
  onClose,
  message,
  products,
  form,
  setForm,
  isSubmitting,
  onSubmit,
  onError
}) {
  const availableProducts = useMemo(() => getAvailableProducts(products), [products]);
  const normalizedItems = useMemo(() => {
    const sourceItems = Array.isArray(form?.items) && form.items.length > 0 ? form.items : [{}];
    return sourceItems.map((item) => buildNormalizedItem(item, availableProducts));
  }, [availableProducts, form?.items]);

  const productById = useMemo(() => {
    const map = {};
    availableProducts.forEach((product) => {
      map[String(product.id)] = product;
    });
    return map;
  }, [availableProducts]);

  if (!isOpen) {
    return null;
  }

  const updateItemAt = (index, updates) => {
    setForm((prev) => {
      const sourceItems = Array.isArray(prev.items) && prev.items.length > 0 ? prev.items : [{}];
      const nextItems = sourceItems.map((item, itemIndex) => (
        itemIndex === index ? buildNormalizedItem({ ...item, ...updates }, availableProducts) : buildNormalizedItem(item, availableProducts)
      ));
      return { ...prev, items: nextItems };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...(Array.isArray(prev.items) && prev.items.length > 0 ? prev.items : [{}]), buildNormalizedItem({}, availableProducts)]
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const sourceItems = Array.isArray(prev.items) && prev.items.length > 0 ? prev.items : [{}];
      const nextItems = sourceItems.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        items: nextItems.length > 0 ? nextItems.map((item) => buildNormalizedItem(item, availableProducts)) : [buildNormalizedItem({}, availableProducts)]
      };
    });
  };

  const submitReservation = () => {
    let payload;
    try {
      payload = buildReservationPayload(form, availableProducts);
    } catch (error) {
      onError(error.message || "Unable to create reservation.");
      return;
    }

    Promise.resolve(onSubmit(payload)).catch((error) => {
      onError(error.message || "Unable to create reservation.");
    });
  };

  return (
    <ProductActionModalShell
      isOpen={isOpen}
      title="Add Reservation"
      onClose={onClose}
      message={message}
    >
      <div className="edit-modal-shell manual-reservation-modal-shell">
        <section className="edit-modal-section create-modal-section">
          <h3>Customer Details</h3>
          <p className="field-hint">Add walk-in, assisted, or chat reservations directly to the admin list.</p>
          <div className="manual-reservation-grid">
            <label className="stock-field">
              <span className="stock-field-label">Customer Name</span>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                placeholder="Juan Dela Cruz"
                autoFocus
              />
            </label>
            <label className="stock-field">
              <span className="stock-field-label">Contact</span>
              <input
                type="text"
                value={form.customerContact}
                onChange={(e) => setForm((prev) => ({ ...prev, customerContact: e.target.value }))}
                placeholder="0917..., FB, IG, etc."
              />
            </label>
            <label className="stock-field">
              <span className="stock-field-label">Payment Method</span>
              <select
                value={form.mop}
                onChange={(e) => setForm((prev) => ({ ...prev, mop: e.target.value, mopOther: e.target.value === "OTHER" ? prev.mopOther : "" }))}
              >
                {RESERVATION_MOP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="stock-field">
              <span className="stock-field-label">Promo Code</span>
              <input
                type="text"
                value={form.promoCode}
                onChange={(e) => setForm((prev) => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
                placeholder="Optional"
              />
            </label>
          </div>
          {form.mop === "OTHER" ? (
            <label className="stock-field">
              <span className="stock-field-label">Custom Payment Method</span>
              <input
                type="text"
                value={form.mopOther}
                onChange={(e) => setForm((prev) => ({ ...prev, mopOther: e.target.value }))}
                placeholder="Ex. UnionBank / Cash / Bank Transfer"
              />
            </label>
          ) : null}
          <label className="stock-field">
            <span className="stock-field-label">Notes</span>
            <textarea
              className="manual-reservation-notes"
              rows="3"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional reservation notes"
            />
          </label>
          {form.promoCode?.trim() ? (
            <small className="reservation-original-price">Promo code will be validated when you save the reservation.</small>
          ) : null}
        </section>

        <section className="edit-modal-section create-modal-section">
          <div className="manual-reservation-section-head">
            <div>
              <h3>Reserved Items</h3>
              <p className="field-hint">You can add multiple sizes or products in one reservation.</p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={addItem}
              disabled={availableProducts.length === 0 || isSubmitting}
            >
              <PlusCircle size={16} />
              <span>Add Item</span>
            </button>
          </div>

          {availableProducts.length === 0 ? (
            <p className="field-hint" style={{ margin: 0 }}>
              No active products are available yet. Add and activate a product first before creating a reservation.
            </p>
          ) : normalizedItems.map((item, index) => {
            const product = productById[item.productId] || null;
            const colorwayOptions = product ? getProductColorways(product) : [];
            const department = getDepartmentForColorway(product, item.colorway);
            const sizeSections = product ? buildSizeSections(product, item.colorway) : [];
            const activeSizeGroup = isUnisexDepartment(department)
              ? (item.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
              : (sizeSections[0]?.key || getDefaultSizeGroup(department));
            const activeSizeSection = sizeSections.find((section) => section.key === activeSizeGroup) || sizeSections[0] || null;
            const selectedSizeRow = activeSizeSection?.rows?.find((row) => row.baseSize === item.size) || null;

            return (
              <article className="manual-reservation-item-card" key={`${item.productId || "new"}-${index}`}>
                <div className="manual-reservation-item-card-head">
                  <strong>Item {index + 1}</strong>
                  {normalizedItems.length > 1 ? (
                    <button
                      type="button"
                      className="reservation-delete-btn"
                      onClick={() => removeItem(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>

                <div className="manual-reservation-item-grid">
                  <label className="stock-field">
                    <span className="stock-field-label">Product</span>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItemAt(index, { productId: e.target.value })}
                    >
                      {availableProducts.map((option) => (
                        <option key={option.id} value={option.id}>
                          {`${option.brand || "No Brand"} · ${option.name || `Product #${option.id}`}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stock-field">
                    <span className="stock-field-label">Colorway</span>
                    <select
                      value={item.colorway}
                      onChange={(e) => updateItemAt(index, { colorway: e.target.value })}
                    >
                      {colorwayOptions.map((colorway) => (
                        <option key={`${item.productId}-${colorway}`} value={colorway}>{formatColorwayLabel(colorway)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="stock-field">
                    <span className="stock-field-label">Size Group</span>
                    <select
                      value={activeSizeGroup}
                      onChange={(e) => updateItemAt(index, { sizeGroup: e.target.value })}
                      disabled={sizeSections.length <= 1}
                    >
                      {(sizeSections.length > 0 ? sizeSections : [{ key: activeSizeGroup, label: "US Sizes" }]).map((section) => (
                        <option key={`${item.productId}-${section.key}`} value={section.key}>{section.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="stock-field">
                    <span className="stock-field-label">Size</span>
                    <select
                      value={item.size}
                      onChange={(e) => updateItemAt(index, { size: e.target.value })}
                    >
                      {(activeSizeSection?.rows || []).map((row) => {
                        const sizeLabel = formatSelectedSizeLabel(row.baseSize, activeSizeGroup, department) || `US ${row.baseSize}`;
                        const availabilityLabel = Number(row.total || 0) > 0 ? `${row.total} on hand` : "Pre-order";
                        return (
                          <option key={`${item.productId}-${activeSizeGroup}-${row.baseSize}`} value={row.baseSize}>
                            {`${sizeLabel} · ${availabilityLabel}`}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="stock-field">
                    <span className="stock-field-label">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateItemAt(index, { quantity: e.target.value })}
                    />
                  </label>
                </div>

                <div className="manual-reservation-item-meta">
                  {product?.brand ? <span className="manual-reservation-meta-chip">{product.brand}</span> : null}
                  {department ? <span className="manual-reservation-meta-chip">{formatEnumLabel(department)}</span> : null}
                  {selectedSizeRow ? (
                    <span className="manual-reservation-meta-copy">
                      {formatSelectedSizeLabel(selectedSizeRow.baseSize, activeSizeGroup, department) || `US ${selectedSizeRow.baseSize}`}
                    </span>
                  ) : null}
                  {selectedSizeRow && Number(selectedSizeRow.total || 0) > 0 ? (
                    <span className="manual-reservation-meta-copy">On hand: {selectedSizeRow.total}</span>
                  ) : selectedSizeRow ? (
                    <span className="reservation-preorder-badge">Pre-order</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <div className="create-product-actions-row">
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
            className="create-product-save-btn manual-reservation-save-btn"
            onClick={submitReservation}
            disabled={isSubmitting || availableProducts.length === 0}
          >
            {isSubmitting ? "Saving..." : "Add Reservation"}
          </button>
        </div>
      </div>
    </ProductActionModalShell>
  );
}


