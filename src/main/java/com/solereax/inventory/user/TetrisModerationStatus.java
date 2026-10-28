package com.solereax.inventory.user;

public enum TetrisModerationStatus {
    NORMAL,
    ANOMALY_REVIEW,
    ANOMALY_DETECTED,
    DISQUALIFIED;

    public boolean blocksGameplay() {
        return this == ANOMALY_REVIEW || this == ANOMALY_DETECTED || this == DISQUALIFIED;
    }
}

