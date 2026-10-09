import RegisteredPlayersTable from "./RegisteredPlayersTable.jsx";

export default function GamingSettingsSection({
  gamingSectionVisible,
  isSaving,
  onToggleVisibility,
  registeredPlayers = [],
  isLoadingPlayers = false,
  onBonusAction,
  bonusActionKey,
}) {
  return (
    <section className="card products-card admin-section">
      <div className="section-head">
        <div className="admin-section-heading-copy">
          <h2>Giveaway</h2>
          <p className="field-hint" style={{ margin: 0 }}>
            Control whether customers can see the giveaway game in the customer nav bar.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onToggleVisibility} disabled={isSaving}>
          {gamingSectionVisible ? "Hide from customers" : "Show to customers"}
        </button>
      </div>

        <RegisteredPlayersTable
          players={registeredPlayers}
          isLoading={isLoadingPlayers}
          onBonusAction={onBonusAction}
          bonusActionKey={bonusActionKey}
        />
    </section>
  );
}

