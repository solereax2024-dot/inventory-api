package com.solereax.inventory.basketball.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameScoreboardResponse {

    private Long gameId;
    private String teamAName;
    private String teamBName;
    private Integer teamAScore;
    private Integer teamBScore;
    private Integer quarter;
    private Integer gameTime; // in seconds
    private String gameStatus; // NOT_STARTED, PLAYING, FINISHED
    private LocalDateTime gameDate;
    private String winnerTeamName; // if game is finished
}

