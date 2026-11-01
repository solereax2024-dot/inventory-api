package com.solereax.inventory.giveaway;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "giveaway_wheel_draws")
public class GiveawayWheelDraw {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "winner_entry_id", nullable = false)
    private Long winnerEntryId;

    @Column(name = "winner_full_name", nullable = false, length = 255)
    private String winnerFullName;

    @Column(name = "winner_entry_count", nullable = false)
    private int winnerEntryCount;

    @Column(name = "total_tickets", nullable = false)
    private int totalTickets;

    @Column(name = "winning_ticket_index", nullable = false)
    private int winningTicketIndex;

    @Column(name = "winner_ticket_offset", nullable = false)
    private int winnerTicketOffset;

    @Column(name = "eligible_entry_count", nullable = false)
    private int eligibleEntryCount;

    @Column(name = "draw_snapshot_hash", nullable = false, length = 64)
    private String drawSnapshotHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

