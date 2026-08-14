package com.solereax.inventory.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminUpdateColorwayImageRequest(
        @NotBlank
        @Size(max = 80)
        String colorway,
        @NotBlank
        @Size(max = 500)
        String imageUrl
) {
}
