export default function ReserveSizeGuideModal({
  isOpen,
  onClose,
  sizeGuide,
  sizeGuideSection
}) {
  if (!isOpen || !sizeGuide || !sizeGuideSection) return null;

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
                {sizeGuideSection.columns.map((column) => (
                  <th key={`guide-head-${column.key}`}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizeGuideSection.rows.map((row, index) => (
                <tr key={`${sizeGuide.brandLabel}-${sizeGuideSection.label || "guide"}-${index}`}>
                  {sizeGuideSection.columns.map((column) => (
                    <td key={`guide-cell-${column.key}-${index}`}>{row[column.key] || "-"}</td>
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

