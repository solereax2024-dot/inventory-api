import { formatColorwayLabel } from "../../../utils/format";
import { formatReservationItemSizeLabel } from "../../../utils/reservationHelpers";

const PREORDER_SUPPLIER_BREAKDOWN_MARKER = "__PREORDER__";

export default function AdminReservationItemsCell({ order, productById }) {
  return (
    <td className="reservation-items-cell">
      {(order.items || []).map((item, index) => (
        <div key={`${order.id}-${item.productId || item.productName}-${index}`} className="reservation-item-line">
          <strong>
            {item.productName}
            {item.supplierBreakdown === PREORDER_SUPPLIER_BREAKDOWN_MARKER ? (
              <span className="reservation-preorder-badge">Pre-Order</span>
            ) : null}
          </strong>
          <span>
            {formatColorwayLabel(item.colorway)} · {formatReservationItemSizeLabel(item, productById)} · Qty {item.quantity}
          </span>
        </div>
      ))}
    </td>
  );
}

