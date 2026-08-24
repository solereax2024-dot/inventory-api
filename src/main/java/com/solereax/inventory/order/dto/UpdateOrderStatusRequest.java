package com.solereax.inventory.order.dto;

import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateOrderStatusRequest(
        @Size(max = 30) String status,
        @Size(max = 30) String courier,
        @Size(max = 30) String mop,
        @Size(max = 120) String mopOther,
        BigDecimal totalPrice
) {
}
