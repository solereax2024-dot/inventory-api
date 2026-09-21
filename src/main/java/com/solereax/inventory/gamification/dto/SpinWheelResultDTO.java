package com.solereax.inventory.gamification.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class SpinWheelResultDTO {
    private Integer pointsEarned;
    private String message;
    private Integer newBalance;
}

