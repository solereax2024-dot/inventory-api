package com.solereax.inventory.tetris;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TetrisScoreSubmissionResponse {
    private String playerName;
    private Integer highestScore;
    private Integer highestLevel;
    private Integer totalGames;
    private Integer totalLinesCleared;
    private Integer rank;
    private boolean inTop10;
}

