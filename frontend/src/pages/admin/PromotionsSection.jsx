import { useEffect, useMemo, useState } from "react";
import { Copy, Trash2, TicketPercent, WandSparkles } from "lucide-react";
import { apiRequest } from "../../utils/api";
import { PHP_CURRENCY } from "../../utils/price";

const DEFAULT_FORM = {
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
  active: true
};

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function buildPromoPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderAmount: form.minOrderAmount === "" ? null : Number(form.minOrderAmount),
    maxDiscountAmount: form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount),
    usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    active: Boolean(form.active)
  };
}

function buildEditForm(promo) {
  return {
    code: promo.code || "",
    name: promo.name || "",
    description: promo.description || "",
    discountType: promo.discountType || "PERCENT",
    discountValue: promo.discountValue === null || promo.discountValue === undefined ? "" : String(promo.discountValue),
    minOrderAmount: promo.minOrderAmount === null || promo.minOrderAmount === undefined ? "" : String(promo.minOrderAmount),
    maxDiscountAmount: promo.maxDiscountAmount === null || promo.maxDiscountAmount === undefined ? "" : String(promo.maxDiscountAmount),
    usageLimit: promo.usageLimit === null || promo.usageLimit === undefined ? "" : String(promo.usageLimit),
    startsAt: toDatetimeLocalValue(promo.startsAt),
    endsAt: toDatetimeLocalValue(promo.endsAt),
    active: Boolean(promo.active)
  };
}


function formatDiscountSummary(promo) {
  const value = Number(promo.discountValue || 0);
  const amountLabel = promo.discountType === "PERCENT"
    ? `${value}% off`
    : `${PHP_CURRENCY.format(value)} off`;
  const limitLabel = promo.maxDiscountAmount ? ` · cap ${PHP_CURRENCY.format(Number(promo.maxDiscountAmount))}` : "";
  return `${amountLabel}${limitLabel}`;
}

export default function PromotionsSection({ token }) {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editModal, setEditModal] = useState({ isOpen: false, promotionId: null });
  const [editForm, setEditForm] = useState(DEFAULT_FORM);

  const activeCount = useMemo(() => promotions.filter((promo) => promo.active).length, [promotions]);
  const totalUsage = useMemo(() => promotions.reduce((sum, promo) => sum + Number(promo.usedCount || 0), 0), [promotions]);

  const loadPromotions = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/admin/promotions", "GET", undefined, token);
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage(err.message || "Failed to load promotions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions().catch((err) => setMessage(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const generateCode = () => {
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    const prefix = "SRX";
    setForm((prev) => ({ ...prev, code: `${prefix}${random}` }));
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

  const saveEditPromotion = async () => {
    if (!editModal.promotionId) return;
    const trimmedCode = editForm.code.trim().toUpperCase();
    const trimmedName = editForm.name.trim();
    if (!trimmedCode || !trimmedName) {
      setMessage("Please enter a voucher code and name.");
      return;
    }
    try {
      await apiRequest(`/api/admin/promotions/${editModal.promotionId}`, "PATCH", buildPromoPayload(editForm), token);
      setSuccessMessage(`Promotion ${trimmedCode} updated.`);
      closeEditPromotion();
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to update promotion.");
    }
  };

  const togglePromotionActive = async (promotion) => {
    try {
      await apiRequest(`/api/admin/promotions/${promotion.id}`, "PATCH", {
        active: !promotion.active
      }, token);
      setSuccessMessage(`Promotion ${promotion.code} ${promotion.active ? "deactivated" : "activated"}.`);
      await loadPromotions();
    } catch (err) {
      setMessage(err.message || "Failed to update promotion status.");
    }
  };

  const createPromotion = async () => {
    setMessage("");
    setSuccessMessage("");
    const trimmedCode = form.code.trim().toUpperCase();
    const trimmedName = form.name.trim();
    if (!trimmedCode || !trimmedName) {
      setMessage("Please enter a voucher code and name.");
      return;
    }
    try {
      await apiRequest("/api/admin/promotions", "POST", buildPromoPayload(form), token);
      setSuccessMessage(`Promotion ${trimmedCode} created.`);
      setForm(DEFAULT_FORM);
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


  return (
    <section className="card products-card admin-section">
      <div className="section-head">
        <h2>Promotions</h2>
        <p className="field-hint" style={{ margin: 0 }}>
          Create voucher codes for customer reservations and track usage in one place.
        </p>
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

      <div className="admin-promo-form-grid" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
        <div>
          <label className="field-label">Voucher Code</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="SRXSAVE20"
              maxLength={40}
            />
            <button type="button" className="button-secondary" onClick={generateCode} title="Generate code">
              <WandSparkles size={16} />
            </button>
          </div>
        </div>
        <div>
          <label className="field-label">Promotion Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="20% off launch promo"
            maxLength={120}
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional note for admin"
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
          <label className="field-label">Starts At</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">Ends At</label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Active now
          </label>
        </div>
      </div>

      <div className="reserve-form-actions" style={{ marginBottom: 18 }}>
        <button type="button" className="btn-primary" onClick={createPromotion}>
          <TicketPercent size={16} />
          <span>Create Promotion</span>
        </button>
      </div>

      {editModal.isOpen ? (
        <div className="modal-overlay" onClick={closeEditPromotion}>
          <section className="modal-panel reserve-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header reserve-confirm-header">
              <h2>Edit Promotion</h2>
              <button type="button" className="modal-close-btn" aria-label="Close edit promotion" onClick={closeEditPromotion}>✕</button>
            </div>
            <div className="admin-promo-form-grid" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div>
                <label className="field-label">Voucher Code</label>
                <input value={editForm.code} onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} maxLength={40} />
              </div>
              <div>
                <label className="field-label">Promotion Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} maxLength={120} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <input value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} maxLength={500} />
              </div>
              <div>
                <label className="field-label">Discount Type</label>
                <select value={editForm.discountType} onChange={(e) => setEditForm((prev) => ({ ...prev, discountType: e.target.value }))}>
                  <option value="PERCENT">Percent</option>
                  <option value="FIXED">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="field-label">Discount Value</label>
                <input type="number" min="0" step="0.01" value={editForm.discountValue} onChange={(e) => setEditForm((prev) => ({ ...prev, discountValue: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Minimum Order</label>
                <input type="number" min="0" step="0.01" value={editForm.minOrderAmount} onChange={(e) => setEditForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Max Discount</label>
                <input type="number" min="0" step="0.01" value={editForm.maxDiscountAmount} onChange={(e) => setEditForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Usage Limit</label>
                <input type="number" min="1" step="1" value={editForm.usageLimit} onChange={(e) => setEditForm((prev) => ({ ...prev, usageLimit: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Starts At</label>
                <input type="datetime-local" value={editForm.startsAt} onChange={(e) => setEditForm((prev) => ({ ...prev, startsAt: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Ends At</label>
                <input type="datetime-local" value={editForm.endsAt} onChange={(e) => setEditForm((prev) => ({ ...prev, endsAt: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm((prev) => ({ ...prev, active: e.target.checked }))} />
                  Active now
                </label>
              </div>
            </div>
            <div className="reserve-form-actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn-cancel" onClick={closeEditPromotion}>Cancel</button>
              <button type="button" className="btn-primary" onClick={saveEditPromotion}>
                <TicketPercent size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {successMessage ? <div className="toast-banner" style={{ position: "relative", marginBottom: 12 }}>{successMessage}</div> : null}
      {message ? <p className="message" style={{ marginBottom: 12 }}>{message}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Discount</th>
              <th>Limits</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7"><div className="skeleton-line" /></td>
              </tr>
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan="7">No promotions yet.</td>
              </tr>
            ) : (
              promotions.map((promo) => (
                <tr key={promo.id}>
                  <td><strong>{promo.code}</strong></td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{promo.name}</strong>
                      {promo.description ? <small className="field-hint">{promo.description}</small> : null}
                    </div>
                  </td>
                  <td>{formatDiscountSummary(promo)}</td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span>{promo.minOrderAmount ? `Min ${PHP_CURRENCY.format(Number(promo.minOrderAmount))}` : "No minimum"}</span>
                      <span>{promo.maxDiscountAmount ? `Cap ${PHP_CURRENCY.format(Number(promo.maxDiscountAmount))}` : "No cap"}</span>
                      <span>{promo.startsAt ? `Start ${new Date(promo.startsAt).toLocaleString()}` : "No start date"}</span>
                      <span>{promo.endsAt ? `End ${new Date(promo.endsAt).toLocaleString()}` : "No end date"}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`order-status-chip ${promo.active ? "status-paid" : "status-ordered"}`}>
                      {promo.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{promo.usedCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}</td>
                  <td>
                    <div className="actions-inline admin-actions-inline">
                      <button
                        type="button"
                        className="admin-action-btn quick-tooltip"
                        data-tooltip="Copy Code"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(promo.code);
                            setSuccessMessage(`Copied ${promo.code} to clipboard.`);
                          } catch {
                            setMessage("Unable to copy code.");
                          }
                        }}
                      >
                        <Copy size={15} />
                        <span className="admin-action-label">Copy</span>
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn quick-tooltip"
                        data-tooltip={promo.active ? "Deactivate" : "Activate"}
                        onClick={() => togglePromotionActive(promo)}
                      >
                        <TicketPercent size={15} />
                        <span className="admin-action-label">{promo.active ? "Deactivate" : "Activate"}</span>
                      </button>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

