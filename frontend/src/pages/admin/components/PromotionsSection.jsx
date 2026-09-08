import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, PlusCircle, ShieldCheck, ShieldOff, Trash2, WandSparkles } from "lucide-react";
import { apiRequest } from "../../../utils/api";
import { PHP_CURRENCY } from "../../../utils/price";
import {
  ApplyPromotionScheduleModal,
  CreatePromotionModal,
  EditPromotionModal
} from "../../../components/modals/admin";

const PROMO_TYPES = {
  SALE: "SALE",
  VOUCHER: "VOUCHER"
};

const TARGET_MODES = {
  ALL: "ALL",
  BRANDS: "BRANDS",
  CATEGORIES: "CATEGORIES",
  PRODUCT_TYPES: "PRODUCT_TYPES",
  PRODUCT_IDS: "PRODUCT_IDS"
};

const DEFAULT_FORM = {
  promoType: PROMO_TYPES.VOUCHER,
  code: "",
  name: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "10",
  minOrderAmount: "",
  maxDiscountAmount: "",
  usageLimit: "",
  startsAt: "",
  endsAt: "",
  active: false,
  lowStockOnly: false,
  targetBrands: "",
  targetCategories: "",
  targetProductTypes: "",
  targetProductIds: "",
  targetMode: TARGET_MODES.ALL,
  buyOneTakeOne: false
};

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseMetaDescription(rawDescription) {
  const value = String(rawDescription || "");
  const matched = value.match(/^\[(SALE|VOUCHER)]\s*(.*)$/i);
  if (!matched) {
    return {
      promoType: PROMO_TYPES.VOUCHER,
      description: value
    };
  }
  return {
    promoType: matched[1].toUpperCase() === PROMO_TYPES.SALE ? PROMO_TYPES.SALE : PROMO_TYPES.VOUCHER,
    description: matched[2] || ""
  };
}

function toMetaDescription(promoType, description) {
  const tag = promoType === PROMO_TYPES.SALE ? PROMO_TYPES.SALE : PROMO_TYPES.VOUCHER;
  const clean = String(description || "").trim();
  return clean ? `[${tag}] ${clean}` : `[${tag}]`;
}

function randomLetters(length = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function buildVoucherCode() {
  return `${randomLetters(4)}-${new Date().getFullYear()}`;
}

function normalizePromotion(promo) {
  const parsed = parseMetaDescription(promo.description);
  return {
    ...promo,
    promoType: parsed.promoType,
    descriptionClean: parsed.description
  };
}

function getPromotionTargetMode(promo) {
  if (promo.targetBrands) return TARGET_MODES.BRANDS;
  if (promo.targetCategories) return TARGET_MODES.CATEGORIES;
  if (promo.targetProductTypes) return TARGET_MODES.PRODUCT_TYPES;
  if (promo.targetProductIds) return TARGET_MODES.PRODUCT_IDS;
  return TARGET_MODES.ALL;
}

function buildPromoPayload(form, options = {}) {
  const { preserveSaleCode = false } = options;
  const fallbackCode = buildVoucherCode();
  const normalizedCode = form.promoType === PROMO_TYPES.SALE
    ? (preserveSaleCode
      ? String(form.code || "").trim().toUpperCase()
      : `SALE-AUTO-${Date.now()}`)
    : ((form.code || "").trim().toUpperCase() || fallbackCode);
  const targetMode = form.targetMode || TARGET_MODES.ALL;
  return {
    code: normalizedCode,
    name: String(form.name || "").trim(),
    description: toMetaDescription(form.promoType, form.description),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderAmount: form.minOrderAmount === "" ? null : Number(form.minOrderAmount),
    maxDiscountAmount: form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount),
    usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    active: Boolean(form.active),
    lowStockOnly: Boolean(form.lowStockOnly),
    targetBrands: targetMode === TARGET_MODES.BRANDS ? (String(form.targetBrands || "").trim() || null) : null,
    targetCategories: targetMode === TARGET_MODES.CATEGORIES ? (String(form.targetCategories || "").trim() || null) : null,
    targetProductTypes: targetMode === TARGET_MODES.PRODUCT_TYPES ? (String(form.targetProductTypes || "").trim() || null) : null,
    targetProductIds: targetMode === TARGET_MODES.PRODUCT_IDS ? (String(form.targetProductIds || "").trim() || null) : null,
    buyOneTakeOne: Boolean(form.buyOneTakeOne)
  };
}

function buildEditForm(promo) {
  return {
    promoType: promo.promoType || PROMO_TYPES.VOUCHER,
    code: promo.code || "",
    name: promo.name || "",
    description: promo.descriptionClean || "",
    discountType: promo.discountType || "PERCENT",
    discountValue: promo.discountValue === null || promo.discountValue === undefined ? "" : String(promo.discountValue),
    minOrderAmount: promo.minOrderAmount === null || promo.minOrderAmount === undefined ? "" : String(promo.minOrderAmount),
    maxDiscountAmount: promo.maxDiscountAmount === null || promo.maxDiscountAmount === undefined ? "" : String(promo.maxDiscountAmount),
    usageLimit: promo.usageLimit === null || promo.usageLimit === undefined ? "" : String(promo.usageLimit),
    startsAt: toDatetimeLocalValue(promo.startsAt),
    endsAt: toDatetimeLocalValue(promo.endsAt),
    active: Boolean(promo.active),
    lowStockOnly: Boolean(promo.lowStockOnly),
    targetBrands: promo.targetBrands || "",
    targetCategories: promo.targetCategories || "",
    targetProductTypes: promo.targetProductTypes || "",
    targetProductIds: promo.targetProductIds || "",
    targetMode: getPromotionTargetMode(promo),
    buyOneTakeOne: Boolean(promo.buyOneTakeOne)
  };
}

function formatAppliesToSummary(promo) {
  const tags = [];
  if (promo.lowStockOnly) tags.push("Low stock");
  if (promo.targetBrands) tags.push(`Brands: ${promo.targetBrands}`);
  if (promo.targetCategories) tags.push(`Categories: ${promo.targetCategories}`);
  if (promo.targetProductTypes) tags.push(`Product Types: ${promo.targetProductTypes}`);
  if (promo.targetProductIds) tags.push(`Product IDs: ${promo.targetProductIds}`);
  if (promo.buyOneTakeOne) tags.push("Buy 1 Take 1");
  return tags.length > 0 ? tags.join(" · ") : "All products";
}

function formatDiscountSummary(promo) {
  const value = Number(promo.discountValue || 0);
  const amountLabel = promo.discountType === "PERCENT"
    ? `${value}% off`
    : `${PHP_CURRENCY.format(value)} off`;
  const limitLabel = promo.maxDiscountAmount ? ` · cap ${PHP_CURRENCY.format(Number(promo.maxDiscountAmount))}` : "";
  return `${amountLabel}${limitLabel}`;
}

function getPromotionStatus(promo) {
  if (!promo.active) {
    return { label: "Disabled", className: "status-disabled" };
  }
  const now = Date.now();
  const start = promo.startsAt ? new Date(promo.startsAt).getTime() : null;
  const end = promo.endsAt ? new Date(promo.endsAt).getTime() : null;
  if (start && now < start) {
    return { label: "Inactive", className: "status-preparing" };
  }
  if (end && now > end) {
    return { label: "Inactive", className: "status-preparing" };
  }
  return { label: "Active", className: "status-paid" };
}

export default function PromotionsSection({ token, isSuperAdmin, brandOptions = [] }) {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editModal, setEditModal] = useState({ isOpen: false, promotionId: null });
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [applyModal, setApplyModal] = useState({ isOpen: false, promotionId: null, startsAt: "", endsAt: "" });

  const activeCount = useMemo(() => promotions.filter((promo) => getPromotionStatus(promo).label === "Active").length, [promotions]);
  const totalUsage = useMemo(() => promotions.reduce((sum, promo) => sum + Number(promo.usedCount || 0), 0), [promotions]);

  const loadPromotions = async () => {
    if (!isSuperAdmin) {
      setPromotions([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/admin/promotions", "GET", undefined, token);
      const normalized = (Array.isArray(data) ? data : []).map(normalizePromotion);
      setPromotions(normalized);
    } catch (err) {
      setMessage(err.message || "Failed to load promotions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions().catch((err) => setMessage(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSuperAdmin]);

  const generateCode = (setter) => {
    const generated = buildVoucherCode();
    setter((prev) => ({ ...prev, code: generated }));
  };

  const openEditPromotion = (promotion) => {
    setMessage("");
    setSuccessMessage("");
    setEditModal({ isOpen: true, promotionId: promotion.id });
    setEditForm(buildEditForm(promotion));
  };

  const closeEditPromotion = () => {
    setEditModal({ isOpen: false, promotionId: null });
    setEditForm(DEFAULT_FORM);
  };

  const openApplyModal = (promotion) => {
    setMessage("");
    setSuccessMessage("");
    setApplyModal({
      isOpen: true,
      promotionId: promotion.id,
      startsAt: toDatetimeLocalValue(promotion.startsAt),
      endsAt: toDatetimeLocalValue(promotion.endsAt)
    });
  };

  const closeApplyModal = () => {
    setApplyModal({ isOpen: false, promotionId: null, startsAt: "", endsAt: "" });
  };

  const saveEditPromotion = async () => {
    if (!editModal.promotionId) return;
    const trimmedCode = editForm.code.trim().toUpperCase();
    const isVoucher = editForm.promoType === PROMO_TYPES.VOUCHER;
    const trimmedName = editForm.name.trim();
    if (!trimmedName || (isVoucher && !trimmedCode)) {
      setMessage(isVoucher ? "Please enter a voucher code and name." : "Please enter a promotion name.");
      return;
    }
    try {
      const payload = buildPromoPayload(editForm, { preserveSaleCode: true });
      if (editForm.promoType === PROMO_TYPES.SALE) {
        payload.code = null;
      }
      await apiRequest(
        `/api/admin/promotions/${editModal.promotionId}`,
        "PATCH",
        payload,
        token
      );
      setSuccessMessage(`Promotion ${trimmedName} updated.`);
      closeEditPromotion();
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to update promotion.");
    }
  };

  const disablePromotion = async (promotion) => {
    try {
      await apiRequest(`/api/admin/promotions/${promotion.id}`, "PATCH", { active: false }, token);
      setSuccessMessage(`Promotion ${promotion.code} disabled.`);
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to disable promotion.");
    }
  };

  const enablePromotion = async (promotion) => {
    try {
      await apiRequest(`/api/admin/promotions/${promotion.id}`, "PATCH", { active: true }, token);
      setSuccessMessage(`Promotion ${promotion.code} enabled.`);
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to enable promotion.");
    }
  };

  const applyPromotionSchedule = async () => {
    if (!applyModal.promotionId) return;
    const startsAt = applyModal.startsAt ? new Date(applyModal.startsAt).toISOString() : null;
    const endsAt = applyModal.endsAt ? new Date(applyModal.endsAt).toISOString() : null;
    if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      setMessage("End date must be after start date.");
      return;
    }
    try {
      await apiRequest(`/api/admin/promotions/${applyModal.promotionId}`, "PATCH", {
        startsAt,
        endsAt,
        active: true
      }, token);
      setSuccessMessage("Promotion schedule applied.");
      closeApplyModal();
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to apply promotion schedule.");
    }
  };

  const createPromotion = async () => {
    setMessage("");
    setSuccessMessage("");
    const payload = buildPromoPayload(form);
    const trimmedCode = payload.code;
    const trimmedName = payload.name;
    const isVoucher = form.promoType === PROMO_TYPES.VOUCHER;
    if (!trimmedName || (isVoucher && !trimmedCode)) {
      setMessage(isVoucher ? "Please enter a voucher code and name." : "Please enter a promotion name.");
      return;
    }
    try {
      await apiRequest("/api/admin/promotions", "POST", payload, token);
      setSuccessMessage(`Promotion ${trimmedName} created. It starts inactive until a schedule is applied.`);
      setForm(DEFAULT_FORM);
      setIsCreateOpen(false);
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to create promotion.");
    }
  };

  const deletePromotion = async (promotion) => {
    if (!window.confirm(`Delete promotion ${promotion.code}?`)) {
      return;
    }
    try {
      await apiRequest(`/api/admin/promotions/${promotion.id}`, "DELETE", undefined, token);
      setSuccessMessage(`Promotion ${promotion.code} deleted.`);
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to delete promotion.");
    }
  };

  if (!isSuperAdmin) {
    return (
      <section className="card products-card admin-section">
        <div className="section-head">
          <h2>Promotions</h2>
        </div>
        <p className="field-hint">Promotion management is available for SUPER_ADMIN only.</p>
      </section>
    );
  }

  return (
    <section className="card products-card admin-section">
      <div className="section-head">
        <div>
          <h2>Promotions</h2>
          <p className="field-hint" style={{ margin: 0 }}>
            Create sale promos and reservation vouchers from one simple table.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setForm((prev) => ({
              ...DEFAULT_FORM,
              code: prev.promoType === PROMO_TYPES.VOUCHER ? (prev.code || buildVoucherCode()) : ""
            }));
            setIsCreateOpen(true);
          }}
        >
          <PlusCircle size={16} />
          <span>Add Promotion</span>
        </button>
      </div>

      <div className="admin-summary-grid" style={{ marginBottom: 18 }}>
        <article className="admin-summary-card admin-summary-card-accent">
          <p>Total Promotions</p>
          <h3>{promotions.length}</h3>
        </article>
        <article className="admin-summary-card admin-summary-card-accent">
          <p>Active Promotions</p>
          <h3>{activeCount}</h3>
        </article>
        <article className="admin-summary-card admin-summary-card-accent">
          <p>Total Usage</p>
          <h3>{totalUsage}</h3>
        </article>
      </div>

      <CreatePromotionModal
        isOpen={isCreateOpen}
        form={form}
        setForm={setForm}
        brandOptions={brandOptions}
        onGenerateCode={() => generateCode(setForm)}
        onSave={createPromotion}
        onClose={() => setIsCreateOpen(false)}
      />

      <EditPromotionModal
        isOpen={editModal.isOpen}
        form={editForm}
        setForm={setEditForm}
        brandOptions={brandOptions}
        onGenerateCode={() => generateCode(setEditForm)}
        onSave={saveEditPromotion}
        onClose={closeEditPromotion}
      />

      <ApplyPromotionScheduleModal
        isOpen={applyModal.isOpen}
        startsAt={applyModal.startsAt}
        endsAt={applyModal.endsAt}
        onStartsAtChange={(value) => setApplyModal((prev) => ({ ...prev, startsAt: value }))}
        onEndsAtChange={(value) => setApplyModal((prev) => ({ ...prev, endsAt: value }))}
        onApply={applyPromotionSchedule}
        onClose={closeApplyModal}
      />

      {successMessage ? <div className="toast-banner" style={{ position: "relative", marginBottom: 12 }}>{successMessage}</div> : null}
      {message ? <p className="message" style={{ marginBottom: 12 }}>{message}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table promotions-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Discount</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Scope</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9"><div className="skeleton-line" /></td>
              </tr>
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan="9">No promotions yet.</td>
              </tr>
            ) : (
              promotions.map((promo) => {
                const status = getPromotionStatus(promo);
                return (
                  <tr key={promo.id}>
                    <td><strong>{promo.promoType === PROMO_TYPES.SALE ? "AUTO" : promo.code}</strong></td>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <strong>{promo.name}</strong>
                        {promo.descriptionClean ? <small className="field-hint">{promo.descriptionClean}</small> : null}
                      </div>
                    </td>
                    <td>{promo.promoType === PROMO_TYPES.SALE ? "Sale" : "Voucher"}</td>
                    <td>{formatDiscountSummary(promo)}</td>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span>{promo.startsAt ? `Start ${new Date(promo.startsAt).toLocaleString()}` : "No start date"}</span>
                        <span>{promo.endsAt ? `End ${new Date(promo.endsAt).toLocaleString()}` : "No end date"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`order-status-chip ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>{promo.usedCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}</td>
                    <td>{formatAppliesToSummary(promo)}</td>
                    <td>
                      <div className="actions-inline admin-actions-inline">
                        <button
                          type="button"
                          className="admin-action-btn quick-tooltip"
                          data-tooltip="Copy Code"
                          onClick={async () => {
                            if (promo.promoType === PROMO_TYPES.SALE) {
                              setMessage("Sale promos are auto-applied and have no shareable code.");
                              return;
                            }
                            try {
                              await navigator.clipboard.writeText(promo.code);
                              setSuccessMessage(`Copied ${promo.code} to clipboard.`);
                            } catch {
                              setMessage("Unable to copy code.");
                            }
                          }}
                          disabled={promo.promoType === PROMO_TYPES.SALE}
                        >
                          <Copy size={15} />
                          <span className="admin-action-label">Copy</span>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn quick-tooltip"
                          data-tooltip="Apply Schedule"
                          onClick={() => openApplyModal(promo)}
                        >
                          <CalendarClock size={15} />
                          <span className="admin-action-label">Apply</span>
                        </button>
                        {promo.active ? (
                          <button
                            type="button"
                            className="admin-action-btn quick-tooltip"
                            data-tooltip="Disable"
                            onClick={() => disablePromotion(promo)}
                          >
                            <ShieldOff size={15} />
                            <span className="admin-action-label">Disable</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-action-btn quick-tooltip"
                            data-tooltip="Enable"
                            onClick={() => enablePromotion(promo)}
                          >
                            <ShieldCheck size={15} />
                            <span className="admin-action-label">Enable</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-action-btn quick-tooltip"
                          data-tooltip="Edit"
                          onClick={() => openEditPromotion(promo)}
                        >
                          <WandSparkles size={15} />
                          <span className="admin-action-label">Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-delete admin-action-btn quick-tooltip"
                          data-tooltip="Delete"
                          onClick={() => deletePromotion(promo)}
                        >
                          <Trash2 size={15} />
                          <span className="admin-action-label">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}



