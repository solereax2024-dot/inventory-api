package com.solereax.inventory.gamification.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class BadgeDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String iconEmoji;
    private Integer pointsReward;
    private Boolean earned;
}

