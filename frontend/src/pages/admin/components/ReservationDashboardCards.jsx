export default function ReservationDashboardCards({
  reservationStats,
  reservationMopTotals,
  formatPriceLabel
}) {
  return (
    <div className="admin-summary-grid">
      <article className="admin-summary-card">
        <p>Total</p>
        <h3>{reservationStats.totalReservations}</h3>
      </article>
      <article className="admin-summary-card">
        <p>Preparing</p>
        <h3>{reservationStats.preparingCount}</h3>
      </article>
      <article className="admin-summary-card">
        <p>Total Sales (Paid only)</p>
        <h3 className="admin-summary-value admin-summary-value-price">{formatPriceLabel(reservationStats.totalSalesPaid)}</h3>
      </article>
      <article className="admin-summary-card">
        <p>Total Sales (All reservations)</p>
        <h3 className="admin-summary-value admin-summary-value-price">{formatPriceLabel(reservationStats.totalSalesAll)}</h3>
      </article>
      <article className="admin-summary-card">
        <p>Shipped</p>
        <h3>{reservationStats.shippedCount}</h3>
      </article>
      <article className="admin-summary-card">
        <p>Paid</p>
        <h3>{reservationStats.paidCount}</h3>
      </article>
      {reservationMopTotals.map((entry) => (
        <article key={`mop-total-${entry.key}`} className="admin-summary-card admin-summary-card-accent">
          <p>{entry.label} Total</p>
          <h3 className="admin-summary-value admin-summary-value-price">{formatPriceLabel(entry.total)}</h3>
        </article>
      ))}
    </div>
  );
}

