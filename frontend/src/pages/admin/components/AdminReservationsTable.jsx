import AdminReservationRow from "./AdminReservationRow.jsx";

export default function AdminReservationsTable({
  isAdminLoading,
  reservationTableColumnCount,
  filteredReservations,
  isSuperAdmin,
  updatingOrderId,
  productById,
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
  return (
    <div className="admin-table-wrap">
      <table className="admin-table reservations-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Contact</th>
            <th>Items</th>
            <th>Created</th>
            <th>Courier</th>
            <th>MOP</th>
            <th>Promo</th>
            <th>Price</th>
            <th>Downpayment</th>
            <th>Balance</th>
            <th>Status</th>
            {isSuperAdmin ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {isAdminLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <tr key={`reservation-loading-${index}`}>
                <td colSpan={reservationTableColumnCount}><div className="skeleton-line" /></td>
              </tr>
            ))
          ) : filteredReservations.length === 0 ? (
            <tr>
              <td colSpan={reservationTableColumnCount}>No reservations found.</td>
            </tr>
          ) : (
            filteredReservations.map((order) => (
              <AdminReservationRow
                key={order.id}
                order={order}
                productById={productById}
                isSuperAdmin={isSuperAdmin}
                updatingOrderId={updatingOrderId}
                mopOtherDrafts={mopOtherDrafts}
                setMopOtherDrafts={setMopOtherDrafts}
                priceDrafts={priceDrafts}
                setPriceDrafts={setPriceDrafts}
                downpaymentDrafts={downpaymentDrafts}
                setDownpaymentDrafts={setDownpaymentDrafts}
                balanceDrafts={balanceDrafts}
                setBalanceDrafts={setBalanceDrafts}
                isReservationEditorOpen={isReservationEditorOpen}
                setReservationEditorOpen={setReservationEditorOpen}
                isReservationSaved={isReservationSaved}
                updateReservationStatus={updateReservationStatus}
                saveReservationPrice={saveReservationPrice}
                saveReservationMonetary={saveReservationMonetary}
                openReservationDeleteModal={openReservationDeleteModal}
                onError={onError}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

