package com.solereax.inventory.gamification.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class CustomerProfileDTO {
    private Long id;
    private String username;
    private Integer pointsBalance;
    private Integer totalPointsEarned;
    private Integer purchasesCount;
    private Integer reviewsCount;
    private Integer referralsCount;
    private List<BadgeDTO> badges;
    private Integer unlockedBadgesCount;
}

