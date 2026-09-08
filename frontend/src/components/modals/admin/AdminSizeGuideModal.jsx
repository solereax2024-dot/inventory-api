export default function AdminSizeGuideModal({
  isOpen,
  onClose,
  sizeGuide,
  guideSection
}) {
  if (!isOpen || !sizeGuide || !guideSection) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-panel modal-panel-compact size-guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header">
          <h2>{sizeGuide.brandLabel} Size Guide</h2>
          <button type="button" className="modal-close-btn" aria-label="Close size guide" onClick={onClose}>✕</button>
        </div>
        <div className="size-guide-table-wrap">
          <table className="size-guide-table">
            <thead>
              <tr>
                {guideSection.columns.map((column) => (
                  <th key={`stock-guide-head-modal-${column.key}`}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guideSection.rows.map((row, index) => (
                <tr key={`stock-guide-row-modal-${index}`}>
                  {guideSection.columns.map((column) => (
                    <td key={`stock-guide-cell-modal-${column.key}-${index}`}>{row[column.key] || "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <small className="field-hint modal-hint-top-4">
          Reference from {sizeGuide.sourceLabel}. Actual fit may vary by model.
        </small>
        {sizeGuide.fitNote ? (
          <small className="field-hint modal-hint-top-0">{sizeGuide.fitNote}</small>
        ) : null}
      </section>
    </div>
  );
}

