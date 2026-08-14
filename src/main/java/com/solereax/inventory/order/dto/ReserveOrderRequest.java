package com.solereax.inventory.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ReserveOrderRequest(
        @NotBlank @Size(max = 150) String customerName,
        @NotBlank @Size(max = 100) String customerContact,
        @Size(max = 500) String notes,
        @NotEmpty List<@Valid ReserveOrderItemRequest> items
) {
}
