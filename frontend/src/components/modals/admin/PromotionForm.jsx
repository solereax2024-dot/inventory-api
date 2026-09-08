import { WandSparkles } from "lucide-react";
import { CATEGORY_OPTIONS, PRODUCT_TYPE_OPTIONS } from "../../../constants";
import { formatEnumLabel } from "../../../utils/format";

const TARGET_MODES = {
  ALL: "ALL",
  BRANDS: "BRANDS",
  CATEGORIES: "CATEGORIES",
  PRODUCT_TYPES: "PRODUCT_TYPES",
  PRODUCT_IDS: "PRODUCT_IDS"
};

const PRODUCT_TYPE_TARGET_OPTIONS = [...new Set(Object.values(PRODUCT_TYPE_OPTIONS).flat())].sort();

function parseCsvValues(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyTargetFields(targetMode) {
  return {
    targetMode,
    targetBrands: "",
    targetCategories: "",
    targetProductTypes: "",
    targetProductIds: ""
  };
}

function updateCsvSelection(setForm, field, values) {
  setForm((prev) => ({
    ...prev,
    [field]: values.join(", ")
  }));
}

function renderMultiSelect({ label, field, options, value, setForm, hint }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select
        multiple
        className="promo-target-select"
        size={Math.min(Math.max(options.length, 4), 8)}
        value={parseCsvValues(value)}
        onChange={(e) => updateCsvSelection(setForm, field, Array.from(e.target.selectedOptions).map((option) => option.value))}
      >
        {options.length > 0 ? (
          options.map((option) => (
            <option key={option} value={option}>
              {label === "Product Types" ? formatEnumLabel(option) : option}
            </option>
          ))
        ) : (
          <option value="" disabled>No options available</option>
        )}
      </select>
      <small className="field-hint">{hint}</small>
    </div>
  );
}

export default function PromotionForm({ form, setForm, onGenerateCode, brandOptions = [] }) {
  const isSalePromo = form.promoType === "SALE";
  const targetMode = form.targetMode || TARGET_MODES.ALL;
  const isBrandTarget = targetMode === TARGET_MODES.BRANDS;
  const isCategoryTarget = targetMode === TARGET_MODES.CATEGORIES;
  const isProductTypeTarget = targetMode === TARGET_MODES.PRODUCT_TYPES;
  const isProductIdTarget = targetMode === TARGET_MODES.PRODUCT_IDS;

  const resetTargetMode = (nextMode) => {
    setForm((prev) => ({
      ...prev,
      ...emptyTargetFields(nextMode)
    }));
  };

  return (
    <div className="admin-promo-form-grid modal-grid-auto-220">
      <div className="promo-form-note field-hint">
        New promotions start inactive. Apply a schedule to activate them.
      </div>
      <div>
        <label className="field-label">Promotion Type</label>
        <select
          value={form.promoType}
          onChange={(e) => {
            const nextType = e.target.value;
            setForm((prev) => ({
              ...prev,
              promoType: nextType,
              // SALE promos are automatic and should not expose customer-facing codes.
              code: nextType === "SALE" ? "" : prev.code,
              active: false
            }));
          }}
        >
          <option value="SALE">Sale Promo</option>
          <option value="VOUCHER">Reservation Voucher</option>
        </select>
      </div>
      <div>
        <label className="field-label">Voucher Code</label>
        <div className="modal-flex-gap-8">
          <input
            className="promo-voucher-input"
            value={isSalePromo ? "Auto-applied for SALE" : form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder={isSalePromo ? "Auto-applied for SALE" : "ABCD-2026"}
            maxLength={40}
            disabled={isSalePromo}
          />
          <button
            type="button"
            className="button-secondary"
            onClick={onGenerateCode}
            title="Generate code"
            disabled={isSalePromo}
          >
            <WandSparkles size={16} />
          </button>
        </div>
        <small className="field-hint">
          {isSalePromo
            ? "No voucher code needed for SALE promos. Discount is automatic."
            : "Generate: 4 letters + year, or type custom."}
        </small>
      </div>
      <div>
        <label className="field-label">Promotion Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Back to School Promo"
          maxLength={120}
        />
      </div>
      <div>
        <label className="field-label">Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional internal note"
          maxLength={500}
        />
      </div>
      <div>
        <label className="field-label">Discount Type</label>
        <select
          value={form.discountType}
          onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value }))}
        >
          <option value="PERCENT">Percent</option>
          <option value="FIXED">Fixed Amount</option>
        </select>
      </div>
      <div>
        <label className="field-label">Discount Value</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.discountValue}
          onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
          placeholder={form.discountType === "PERCENT" ? "20" : "500"}
        />
      </div>
      <div>
        <label className="field-label">Minimum Order</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.minOrderAmount}
          onChange={(e) => setForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <div>
        <label className="field-label">Max Discount</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.maxDiscountAmount}
          onChange={(e) => setForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))}
          placeholder="Optional cap"
        />
      </div>
      <div>
        <label className="field-label">Usage Limit</label>
        <input
          type="number"
          min="1"
          step="1"
          value={form.usageLimit}
          onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
          placeholder="Unlimited if blank"
        />
      </div>
      <div>
        <label className="field-label">Scope</label>
        <select
          value={targetMode}
          onChange={(e) => resetTargetMode(e.target.value)}
        >
          <option value={TARGET_MODES.ALL}>All Products</option>
          <option value={TARGET_MODES.BRANDS}>Brands</option>
          <option value={TARGET_MODES.CATEGORIES}>Categories</option>
          <option value={TARGET_MODES.PRODUCT_TYPES}>Product Types</option>
          <option value={TARGET_MODES.PRODUCT_IDS}>Product IDs</option>
        </select>
        <small className="field-hint">Choose one scope only. Leave it on All Products if the promo should apply broadly.</small>
      </div>
      {isBrandTarget ? renderMultiSelect({
        label: "Brands",
        field: "targetBrands",
        options: brandOptions,
        value: form.targetBrands,
        setForm,
        hint: "Hold Command or Ctrl to pick multiple brands."
      }) : null}
      {isCategoryTarget ? renderMultiSelect({
        label: "Categories",
        field: "targetCategories",
        options: CATEGORY_OPTIONS,
        value: form.targetCategories,
        setForm,
        hint: "Hold Command or Ctrl to pick multiple categories."
      }) : null}
      {isProductTypeTarget ? renderMultiSelect({
        label: "Product Types",
        field: "targetProductTypes",
        options: PRODUCT_TYPE_TARGET_OPTIONS,
        value: form.targetProductTypes,
        setForm,
        hint: "Hold Command or Ctrl to pick multiple product types."
      }) : null}
      {isProductIdTarget ? (
        <div>
          <label className="field-label">Product IDs</label>
          <input
            value={form.targetProductIds}
            onChange={(e) => setForm((prev) => ({ ...prev, targetProductIds: e.target.value }))}
            placeholder="101, 205"
          />
          <small className="field-hint">Use comma-separated product IDs when you need to target specific items.</small>
        </div>
      ) : null}
    </div>
  );
}

