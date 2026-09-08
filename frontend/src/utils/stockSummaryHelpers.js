export function filterStockSummaryRows(rows, filters) {
  return (rows || []).filter((row) => {
    if (filters.lowStockOnly && !(Number(row.total || 0) > 0 && Number(row.total || 0) <= 3)) {
      return false;
    }

    return !filters.noSupplierOnly || !(row.supplierEntries || []).some((entry) => String(entry.supplier || "").trim());
  });
}

export function sortStockSummaryRows(rows, sortColumn, sortAscending) {
  const sorted = [...(rows || [])];
  sorted.sort((a, b) => {
    let aVal;
    let bVal;

    switch (sortColumn) {
      case "size":
        aVal = Number(a.baseSize || 0);
        bVal = Number(b.baseSize || 0);
        break;
      case "total":
        aVal = Number(a.total || 0);
        bVal = Number(b.total || 0);
        break;
      case "supplier":
        aVal = String(a.supplier || "");
        bVal = String(b.supplier || "");
        return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case "price":
        aVal = Number(a.price || 0);
        bVal = Number(b.price || 0);
        break;
      default:
        return 0;
    }

    return sortAscending ? aVal - bVal : bVal - aVal;
  });

  return sorted;
}

export function aggregateStockSummaryTotals(rows) {
  return (rows || []).reduce((acc, row) => ({
    total: acc.total + (row.total || 0)
  }), {
    total: 0
  });
}

