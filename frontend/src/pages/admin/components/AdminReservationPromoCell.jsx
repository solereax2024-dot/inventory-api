import { formatPriceLabel } from "../../../utils/adminHelpers";

export default function AdminReservationPromoCell({ promoCode, promoDiscountAmount }) {
  return (
    <td>
      {promoCode ? (
        <div style={{ display: "grid", gap: 4 }}>
          <strong>{promoCode}</strong>
          {promoDiscountAmount ? (
            <small className="reservation-original-price">-{formatPriceLabel(promoDiscountAmount)}</small>
          ) : null}
        </div>
      ) : (
        <span className="field-hint">-</span>
      )}
    </td>
  );
}

