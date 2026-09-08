export default function AdminProductsPagination({
  currentPage,
  totalPages,
  paginationItems,
  onPageChange
}) {
  return (
    <div className="pagination-bar card" style={{ marginTop: "8px" }}>
      <nav aria-label="Admin products pages">
        <ul className="pagination-numbers pages-items">
          {currentPage > 1 ? (
            <>
              <li className="pages-item pages-item-first">
                <button
                  type="button"
                  className="page-number-btn page-nav-btn"
                  onClick={() => onPageChange(1)}
                  aria-label="First page"
                >
                  «
                </button>
              </li>
              <li className="pages-item pages-item-prev">
                <button
                  type="button"
                  className="page-number-btn page-nav-btn"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
              </li>
            </>
          ) : null}
          {paginationItems.map((item) =>
            item.type === "ellipsis" ? (
              <li key={item.value} className="pages-item page-ellipsis" aria-hidden="true">…</li>
            ) : (
              <li key={item.value} className={`pages-item ${currentPage === item.value ? "current" : ""}`}>
                <button
                  type="button"
                  className={`page-number-btn ${currentPage === item.value ? "active" : ""}`}
                  onClick={() => onPageChange(item.value)}
                  aria-label={`Page ${item.value}`}
                  aria-current={currentPage === item.value ? "page" : undefined}
                >
                  {item.value}
                </button>
              </li>
            )
          )}
          {currentPage < totalPages ? (
            <>
              <li className="pages-item pages-item-next">
                <button
                  type="button"
                  className="page-number-btn page-nav-btn"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </li>
              <li className="pages-item pages-item-last">
                <button
                  type="button"
                  className="page-number-btn page-nav-btn"
                  onClick={() => onPageChange(totalPages)}
                  aria-label="Last page"
                >
                  »
                </button>
              </li>
            </>
          ) : null}
        </ul>
      </nav>
    </div>
  );
}

