import { RESERVATION_STATUS_OPTIONS } from "../../../constants";

export default function ReservationFilters({ reservationFilters, setReservationFilters }) {
  return (
    <div className="reservation-filter-row">
      <input
        value={reservationFilters.keyword}
        onChange={(e) => setReservationFilters((prev) => ({ ...prev, keyword: e.target.value }))}
        placeholder="Search by customer, contact, product, colorway, or order #"
      />
      <select
        value={reservationFilters.status}
        onChange={(e) => setReservationFilters((prev) => ({ ...prev, status: e.target.value }))}
      >
        <option value="ALL">All statuses</option>
        {RESERVATION_STATUS_OPTIONS.map((option) => (
          <option key={`reservation-status-filter-${option.value}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

