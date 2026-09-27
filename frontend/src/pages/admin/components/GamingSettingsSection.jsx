const TETRIS_PREVIEW_SRC = "/tetris-game";

export default function GamingSettingsSection({
  gamingSectionVisible,
  isSaving,
  onToggleVisibility,
}) {
  return (
    <section className="card products-card admin-section">
      <div className="section-head">
        <div className="admin-section-heading-copy">
          <h2>Gaming</h2>
          <p className="field-hint" style={{ margin: 0 }}>
            Control whether customers can see the gaming section. Admins can still play it here even when it’s hidden publicly.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onToggleVisibility} disabled={isSaving}>
          {gamingSectionVisible ? "Hide from customers" : "Show to customers"}
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.45rem 0.8rem",
            borderRadius: "999px",
            background: gamingSectionVisible ? "rgba(34, 197, 94, 0.14)" : "rgba(239, 68, 68, 0.14)",
            color: gamingSectionVisible ? "#14532d" : "#7f1d1d",
            border: `1px solid ${gamingSectionVisible ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          {gamingSectionVisible ? "Visible to customers" : "Hidden from customers"}
        </span>
        <span className="field-hint" style={{ margin: 0 }}>
          The preview below always works for admins, even if the public section is turned off.
        </span>
        <a
          href={TETRIS_PREVIEW_SRC}
          target="_blank"
          rel="noreferrer"
          className="filter-drawer-btn"
          style={{ textDecoration: "none" }}
        >
          Open full game
        </a>
      </div>

      <div
        style={{
          borderRadius: "18px",
          border: "1px solid rgba(15, 23, 42, 0.12)",
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96))",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        <iframe
          title="Admin Tetris preview"
          src={TETRIS_PREVIEW_SRC}
          style={{ width: "100%", height: "640px", border: 0, display: "block", background: "#020617" }}
        />
      </div>
    </section>
  );
}

