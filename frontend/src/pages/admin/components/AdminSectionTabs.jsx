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
            {section.label}
          </button>
        ))}
      </div>
    </section>
  );
}

