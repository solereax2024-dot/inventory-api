import { Trash2 } from "lucide-react";
import {
  RESERVATION_COURIER_OPTIONS,
  RESERVATION_STATUS_OPTIONS
} from "../../../constants";
import { formatEnumLabel } from "../../../utils/format";
import { formatPriceLabel, formatReservationDateTime, statusChipClass } from "../../../utils/adminHelpers";
import { buildReservationRowState } from "../../../utils/reservationHelpers";
import AdminReservationItemsCell from "./AdminReservationItemsCell.jsx";
import AdminReservationMonetaryCell from "./AdminReservationMonetaryCell.jsx";
import AdminReservationMopCell from "./AdminReservationMopCell.jsx";
import AdminReservationPromoCell from "./AdminReservationPromoCell.jsx";
import AdminReservationSelectCell from "./AdminReservationSelectCell.jsx";

export default function AdminReservationRow({
  order,
  productById,
  isSuperAdmin,
  updatingOrderId,
  mopOtherDrafts,
  setMopOtherDrafts,
  priceDrafts,
  setPriceDrafts,
  downpaymentDrafts,
  setDownpaymentDrafts,
  balanceDrafts,
  setBalanceDrafts,
  isReservationEditorOpen,
  setReservationEditorOpen,
  isReservationSaved,
  updateReservationStatus,
  saveReservationPrice,
  saveReservationMonetary,
  openReservationDeleteModal,
  onError
}) {
  const {
    normalizedStatus,
    normalizedCourier,
    normalizedMop,
    mopOtherDraft,
    trimmedMopOtherDraft,
    hasOrderPrice,
    normalizedOrderPrice,
    originalPriceTotal,
    hasOriginalPrice,
    hasCustomPrice,
    priceDraft,
    trimmedPriceDraft,
    isPriceDirty,
    hasDownpayment,
    normalizedDownpayment,
    downpaymentDraft,
    trimmedDownpaymentDraft,
    isDownpaymentDirty,
    computedBalance,
    hasBalance,
    balanceDisplayValue,
    normalizedBalance,
    balanceDraft,
    trimmedBalanceDraft,
    isBalanceDirty,
    hasUnsavedMopOther
  } = buildReservationRowState(order, productById, {
    mopOtherDrafts,
    priceDrafts,
    downpaymentDrafts,
    balanceDrafts
  });

  return (
    <tr key={order.id} data-reservation-row-id={String(order.id)}>
      <td>#{order.id}</td>
      <td className="reservation-customer-cell">
        <strong>{order.customerName || "-"}</strong>
        {order.notes ? <small>Note: {order.notes}</small> : null}
      </td>
      <td>{order.customerContact || "-"}</td>
      <AdminReservationItemsCell order={order} productById={productById} />
      <td className="reservation-created-cell">{formatReservationDateTime(order.createdAt)}</td>
      <AdminReservationSelectCell
        orderId={order.id}
        fieldName="courier"
        value={normalizedCourier}
        options={RESERVATION_COURIER_OPTIONS}
        isOpen={isReservationEditorOpen(order.id, "courier")}
        isDisabled={updatingOrderId === order.id}
        isSaved={isReservationSaved(order.id, "courier")}
        onToggle={() => setReservationEditorOpen(order.id, "courier", !isReservationEditorOpen(order.id, "courier"))}
        onChangeValue={(value) => updateReservationStatus(
          order.id,
          { courier: value },
          `Reservation #${order.id} courier set to ${formatEnumLabel(value)}.`,
          "courier"
        ).then(() => setReservationEditorOpen(order.id, "courier", false)).catch((err) => onError(err.message))}
        selectPlaceholder="Select courier"
        displayText={normalizedCourier ? formatEnumLabel(normalizedCourier) : "No Courier"}
        displayChipClass={`order-status-chip reservation-final-chip ${normalizedCourier ? "status-shipped" : "status-ordered"}`}
        openAriaLabel="Close courier selector"
        closedAriaLabel="Set courier"
      />
      <AdminReservationMopCell
        order={order}
        normalizedMop={normalizedMop}
        mopOtherDraft={mopOtherDraft}
        trimmedMopOtherDraft={trimmedMopOtherDraft}
        hasUnsavedMopOther={hasUnsavedMopOther}
        isDisabled={updatingOrderId === order.id}
        isReservationEditorOpen={isReservationEditorOpen}
        setReservationEditorOpen={setReservationEditorOpen}
        isReservationSaved={isReservationSaved}
        setMopOtherDrafts={setMopOtherDrafts}
        updateReservationStatus={updateReservationStatus}
        onError={onError}
      />
      <AdminReservationPromoCell
        promoCode={order.promoCode}
        promoDiscountAmount={order.promoDiscountAmount}
      />
      <AdminReservationMonetaryCell
        orderId={order.id}
        fieldName="price"
        draftValue={priceDraft}
        trimmedDraftValue={trimmedPriceDraft}
        normalizedValue={normalizedOrderPrice}
        isDirty={isPriceDirty}
        hasValue={hasOrderPrice}
        displayValue={formatPriceLabel(order.totalPrice)}
        chipClassWhenHasValue="status-delivered"
        chipClassWhenEmpty="status-ordered"
        openAriaLabel="Close price editor"
        closedAriaLabel="Set price"
        isDisabled={updatingOrderId === order.id}
        isSaved={isReservationSaved(order.id, "price")}
        setDrafts={setPriceDrafts}
        setReservationEditorOpen={setReservationEditorOpen}
        isReservationEditorOpen={isReservationEditorOpen}
        onSaveDraft={() => saveReservationPrice(order.id, priceDraft)}
        extraInside={(
          <>
            {order.promoCode ? (
              <small className="reservation-original-price">
                Promo {order.promoCode} · Discount {formatPriceLabel(order.promoDiscountAmount)}
              </small>
            ) : null}
            {order.promoCode && order.subtotalPrice ? (
              <small className="reservation-original-price">
                Subtotal: {formatPriceLabel(order.subtotalPrice)}
              </small>
            ) : null}
          </>
        )}
        footer={hasOriginalPrice ? (
          <small className={`reservation-original-price ${hasCustomPrice ? "is-overridden" : ""}`}>
            Original: {formatPriceLabel(originalPriceTotal)}
          </small>
        ) : null}
      />
      <AdminReservationMonetaryCell
        orderId={order.id}
        fieldName="downpayment"
        draftValue={downpaymentDraft}
        trimmedDraftValue={trimmedDownpaymentDraft}
        normalizedValue={normalizedDownpayment}
        isDirty={isDownpaymentDirty}
        hasValue={hasDownpayment}
        displayValue={formatPriceLabel(order.downpayment)}
        chipClassWhenHasValue="status-delivered"
        chipClassWhenEmpty="status-ordered"
        openAriaLabel="Close downpayment editor"
        closedAriaLabel="Set downpayment"
        isDisabled={updatingOrderId === order.id}
        isSaved={isReservationSaved(order.id, "downpayment")}
        setDrafts={setDownpaymentDrafts}
        setReservationEditorOpen={setReservationEditorOpen}
        isReservationEditorOpen={isReservationEditorOpen}
        onSaveDraft={() => saveReservationMonetary(order.id, "downpayment", downpaymentDraft, "Downpayment", setDownpaymentDrafts)}
      />
      <AdminReservationMonetaryCell
        orderId={order.id}
        fieldName="balance"
        draftValue={balanceDraft}
        trimmedDraftValue={trimmedBalanceDraft}
        normalizedValue={normalizedBalance}
        isDirty={isBalanceDirty}
        hasValue={balanceDisplayValue !== null}
        displayValue={formatPriceLabel(balanceDisplayValue)}
        chipClassWhenHasValue="status-preparing"
        chipClassWhenEmpty="status-ordered"
        openAriaLabel="Close balance editor"
        closedAriaLabel="Set balance"
        isDisabled={updatingOrderId === order.id}
        isSaved={isReservationSaved(order.id, "balance")}
        setDrafts={setBalanceDrafts}
        setReservationEditorOpen={setReservationEditorOpen}
        isReservationEditorOpen={isReservationEditorOpen}
        onSaveDraft={() => saveReservationMonetary(order.id, "balance", balanceDraft, "Balance", setBalanceDrafts)}
        footer={!hasBalance && computedBalance !== null ? (
          <small className="reservation-original-price">Auto: {formatPriceLabel(computedBalance)}</small>
        ) : null}
      />
      <AdminReservationSelectCell
        orderId={order.id}
        fieldName="status"
        value={normalizedStatus}
        options={RESERVATION_STATUS_OPTIONS}
        isOpen={isReservationEditorOpen(order.id, "status")}
        isDisabled={updatingOrderId === order.id}
        isSaved={isReservationSaved(order.id, "status")}
        onToggle={() => setReservationEditorOpen(order.id, "status", !isReservationEditorOpen(order.id, "status"))}
        onChangeValue={(value) => updateReservationStatus(
          order.id,
          { status: value },
          `Reservation #${order.id} updated to ${formatEnumLabel(value)}.`,
          "status"
        ).then(() => setReservationEditorOpen(order.id, "status", false)).catch((err) => onError(err.message))}
        displayText={formatEnumLabel(normalizedStatus)}
        displayChipClass={`order-status-chip ${statusChipClass(normalizedStatus)}`}
        openAriaLabel="Close status selector"
        closedAriaLabel="Set status"
        containerClassName="reservation-status-cell"
      />
      {isSuperAdmin ? (
        <td>
          <button
            type="button"
            className="reservation-delete-btn"
            onClick={() => openReservationDeleteModal(order)}
            disabled={updatingOrderId === order.id}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </td>
      ) : null}
    </tr>
  );
}

