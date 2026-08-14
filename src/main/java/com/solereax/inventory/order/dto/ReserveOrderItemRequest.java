package com.solereax.inventory.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReserveOrderItemRequest(
        @NotNull Long productId,
        @NotBlank @Size(max = 80) String colorway,
        @NotBlank @Size(max = 20) String size,
        @NotNull @Min(1) Integer quantity
) {
}
