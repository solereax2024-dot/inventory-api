export default function AdminSectionTabs({ adminSections, activeAdminSection, onSelectSection }) {
  return (
    <section className="card admin-subnav">
      <div className="admin-subnav-tabs">
        {adminSections.map((section) => (
          <button
            key={section.key}
            type="button"
            className={`admin-subnav-tab ${activeAdminSection === section.key ? "active" : ""}`}
            onClick={() => onSelectSection(section.key)}
          >
            <span>{section.label}</span>
            {Number(section.badgeCount || 0) > 0 ? (
              <span className="admin-subnav-badge" aria-label={`${section.badgeCount} new`}>{section.badgeCount}</span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

