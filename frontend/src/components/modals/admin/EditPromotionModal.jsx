import { TicketPercent } from "lucide-react";
import PromotionForm from "./PromotionForm";

export default function EditPromotionModal({
  isOpen,
  form,
  setForm,
  brandOptions,
  productOptions,
  onGenerateCode,
  onSave,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-panel reserve-confirm-modal promo-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header reserve-confirm-header">
          <h2>Edit Promotion</h2>
          <button type="button" className="modal-close-btn" aria-label="Close edit promotion" onClick={onClose}>✕</button>
        </div>
        <PromotionForm
          form={form}
          setForm={setForm}
          brandOptions={brandOptions}
          productOptions={productOptions}
          onGenerateCode={onGenerateCode}
        />
        <div className="confirm-action-footer promo-modal-footer promo-modal-footer-spaced modal-sticky-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={onSave}>
            <TicketPercent size={16} />
            <span>Save Changes</span>
          </button>
        </div>
      </section>
    </div>
  );
}

