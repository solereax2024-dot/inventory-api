export const RESERVATION_STATUS_OPTIONS = [
  { value: "ORDERED", label: "Ordered" },
  { value: "PREPARING", label: "Preparing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "PAID", label: "Paid" }
];

export const RESERVATION_COURIER_OPTIONS = [
  { value: "LALAMOVE", label: "Lalamove" },
  { value: "GRAB", label: "Grab" },
  { value: "LBC", label: "LBC" },
  { value: "OTHER", label: "Other" }
];

export const RESERVATION_MOP_OPTIONS = [
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BPI", label: "BPI" },
  { value: "BDO", label: "BDO" },
  { value: "MARIBANK", label: "MariBank" },
  { value: "PAYMONGO", label: "PayMongo Checkout" },
  { value: "OTHER", label: "Other" }
];

export const CUSTOMER_MOP_OPTIONS = RESERVATION_MOP_OPTIONS;

