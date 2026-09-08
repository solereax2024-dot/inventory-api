export default function AdminProductsTableFilters({ tableFilters, brandOptions, onProductFilterChange }) {
  return (
    <tr>
      <th>
        <input
          value={tableFilters.product}
          onChange={(event) => onProductFilterChange("product", event.target.value)}
          placeholder="Filter product"
        />
      </th>
      <th>
        <select
          value={tableFilters.brand}
          onChange={(event) => onProductFilterChange("brand", event.target.value)}
        >
          <option value="ALL">All</option>
          {brandOptions.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </th>
      <th />
    </tr>
  );
}

