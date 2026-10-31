package com.solereax.inventory.giveaway;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GiveawayWheelDrawRepository extends JpaRepository<GiveawayWheelDraw, Long> {
	long deleteAllByIdIsNotNull();
}

