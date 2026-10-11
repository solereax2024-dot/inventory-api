import { Plus } from "lucide-react";

export default function GiveawaySelector({
  giveaways = [],
  selectedGiveawayId = 1,
  onSelectGiveaway,
  onAddGiveaway,
}) {
  return (
    <div className="giveaway-selector-container">
      <div className="giveaway-selector-nav">
        <div className="giveaway-selector-tabs">
          {giveaways.map((giveaway) => (
            <button
              key={giveaway.id}
              type="button"
              className={["giveaway-selector-tab", selectedGiveawayId === giveaway.id ? "is-active" : ""].filter(Boolean).join(" ")}
              onClick={() => onSelectGiveaway(giveaway.id)}
            >
              <span className="giveaway-selector-tab-label">Giveaway {giveaway.id}</span>
              {giveaway.title && <small className="giveaway-selector-tab-hint">{giveaway.title}</small>}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="giveaway-selector-add-btn"
          onClick={onAddGiveaway}
          title="Add new giveaway"
          aria-label="Add new giveaway"
        >
          <Plus size={16} />
          <span>Add Giveaway</span>
        </button>
      </div>
    </div>
  );
}

