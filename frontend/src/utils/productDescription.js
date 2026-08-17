const PRODUCT_TYPE_DEFAULT_COPY = {
  LIFESTYLE_SNEAKERS: "Built for daily wear with a clean and versatile lifestyle look.",
  CASUAL_SNEAKERS: "Made for casual everyday comfort and easy all-day styling.",
  RUNNING_SHOES: "Designed for running sessions with responsive comfort and stable support.",
  TENNIS_SHOES: "Built for tennis movement with reliable traction and lateral stability.",
  PICKLEBALL_SHOES: "Optimized for pickleball footwork with quick side-to-side support.",
  BASKETBALL_SHOES: "Built for court play with strong grip and impact protection.",
  TRAINING_SHOES: "Great for gym training with balanced support and flexibility.",
  FOOTBALL_BOOTS: "Built for pitch control, traction, and quick directional changes.",
  SANDALS: "Lightweight and breathable for easy everyday use.",
  CLOGS: "Easy slip-on comfort for daily use.",
  T_SHIRT: "Comfortable essential for daily wear.",
  JACKET: "Layer-ready piece for daily protection and style.",
  HOODIE: "Comfort-focused layer for casual wear.",
  PANTS: "Comfortable everyday pants with flexible wearability.",
  SHORTS: "Breathable shorts for active or casual use.",
  JERSEY: "Sport-inspired top built for comfort and movement.",
  CAP: "Everyday cap with a clean, practical fit.",
  SOCKS: "Daily socks focused on comfort and support.",
  BAG: "Practical carry option for everyday essentials."
};

function formatEnumLabel(value = "") {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildDefaultProductDescription(form = {}) {
  const namePart = [form.brand, form.name].filter(Boolean).map((value) => value.trim()).filter(Boolean).join(" ");
  const title = namePart || "This product";
  const department = formatEnumLabel(form.department || "UNISEX").toLowerCase();
  const productType = formatEnumLabel(form.productType || "LIFESTYLE_SNEAKERS").toLowerCase();
  const defaultCopy = PRODUCT_TYPE_DEFAULT_COPY[form.productType] || "Great option for everyday use.";
  const colorLine = (form.mainColor || "").trim() ? ` Colorway: ${(form.mainColor || "").trim()}.` : "";

  return `${title} is a ${department} ${productType}. ${defaultCopy}${colorLine}`;
}

