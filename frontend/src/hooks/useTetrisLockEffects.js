import { useCallback } from "react";
import {
  IMPACT_PULSE_DURATION_MS,
  LINE_CLEAR_FLASH_DURATION_MS,
  LINE_SHIFT_DURATION_BASE_MS,
  LINE_SHIFT_DURATION_MAX_MS,
  LINE_SHIFT_DURATION_PER_ROW_MS,
  ROW_COLLAPSE_STAGGER_MS,
} from "../constants/tetris";
import { createImpactPulseState } from "../utils/tetrisGame";

export default function useTetrisLockEffects({
  comboChainRef,
  previousClearWasTetrisRef,
  scheduleUiTimeout,
  emitSound,
  triggerHaptic,
  level,
  setLockPulseCells,
  setImpactPulse,
  setComboCount,
  setBackToBackActive,
  setTSpinActive,
  setLevelUpPulse,
  setScore,
  setPointPopups,
  setClearEffectVariant,
  setClearIntensity,
  setRowClearFlashRows,
  setRowShiftBlocks,
  setIsTetrisClearActive,
  setMessage,
  setCurrentPiece,
  setCurrentPieceKey,
  setGameOver,
  setIsPaused,
  setCurrentTileId,
  setCurrentPieceRow,
  setCurrentPieceCol,
  syncUpcomingQueue,
  setPieceSpawnPulse,
}) {
  return useCallback(({
    outcome,
    source = "lock",
    dropDistance = 0,
    onAfterSpawn,
  }) => {
    const {
      placedGrid,
      lockedCells,
      clearedRows,
      clearedLineCount,
      didTSpin,
      comboBonusCount,
      bonusPoints,
      isDifficultClear,
      receivesBackToBackBonus,
      nextClearIntensity,
      nextLevel,
      upcomingPiece,
      upcomingPieceKey,
      upcomingTileId,
      refreshedQueueEntries,
      spawnCol,
      canSpawnUpcomingPiece,
    } = outcome;

    setLockPulseCells(lockedCells);
    scheduleUiTimeout(() => setLockPulseCells([]), 180);

    const nextImpactPulse = createImpactPulseState(lockedCells, source, dropDistance);
    if (nextImpactPulse) {
      setImpactPulse(nextImpactPulse);
      scheduleUiTimeout(() => {
        setImpactPulse((previousPulse) => (previousPulse?.id === nextImpactPulse.id ? null : previousPulse));
      }, IMPACT_PULSE_DURATION_MS);
    }

    setComboCount(comboBonusCount);
    setBackToBackActive(receivesBackToBackBonus);
    setTSpinActive(didTSpin);
    if (didTSpin) {
      scheduleUiTimeout(() => setTSpinActive(false), 1200);
    }

    if (nextLevel > level) {
      setLevelUpPulse(true);
      scheduleUiTimeout(() => setLevelUpPulse(false), 1000);
      emitSound("levelUp");
    }

    if (bonusPoints > 0) {
      const popupId = `${Date.now()}-${Math.random()}`;
      setScore((previousScore) => previousScore + bonusPoints);
      setPointPopups((previousPopups) => ([
        ...previousPopups,
        { id: popupId, points: bonusPoints, isTetris: clearedLineCount === 4, isTSpin: didTSpin, xOffset: 0 },
      ]));
      scheduleUiTimeout(() => {
        setPointPopups((previousPopups) => previousPopups.filter((popup) => popup.id !== popupId));
      }, 1400);
    }

    if (clearedLineCount > 0) {
      const shiftingBlocks = placedGrid.reduce((blocks, row, rowIndex) => {
        if (clearedRows.includes(rowIndex)) return blocks;

        const shiftCount = clearedRows.filter((clearedRowIndex) => clearedRowIndex > rowIndex).length;
        if (shiftCount <= 0) return blocks;
        const nearestClearedRowDistance = Math.min(
          ...clearedRows
            .filter((clearedRowIndex) => clearedRowIndex > rowIndex)
            .map((clearedRowIndex) => clearedRowIndex - rowIndex)
        );
        const shiftDelayMs = Math.min(Math.max(nearestClearedRowDistance - 1, 0) * ROW_COLLAPSE_STAGGER_MS, 120);

        row.forEach((tileId, colIndex) => {
          if (tileId === null) return;

          blocks.push({
            id: `shift-${rowIndex}-${colIndex}-${tileId}`,
            rowIndex,
            colIndex,
            tileId,
            shiftCount,
            shiftDelayMs,
          });
        });

        return blocks;
      }, []);

      const nextClearEffectVariant = didTSpin
        ? "tspin"
        : clearedLineCount === 4
          ? "tetris"
          : clearedLineCount > 1
            ? "multi"
            : "single";

      setClearEffectVariant(nextClearEffectVariant);
      setClearIntensity(nextClearIntensity);
      setRowClearFlashRows(clearedRows);
      setRowShiftBlocks(shiftingBlocks);
      setIsTetrisClearActive(clearedLineCount === 4);
      setMessage(
        didTSpin
          ? `T-Spin${clearedLineCount > 0 ? ` ${["", "Single", "Double", "Triple"][clearedLineCount]}` : ""}!`
          : clearedLineCount === 4
            ? `${receivesBackToBackBonus ? "Back-to-Back Tetris!" : "Tetris! Four lines cleared!"}`
            : `${clearedLineCount} line${clearedLineCount > 1 ? "s" : ""} cleared!`
      );
      const maxShiftDelayMs = shiftingBlocks.reduce((maxDelay, block) => Math.max(maxDelay, block.shiftDelayMs || 0), 0);
      const clearEffectDuration = Math.min(
        LINE_SHIFT_DURATION_MAX_MS,
        LINE_SHIFT_DURATION_BASE_MS + (clearedLineCount * LINE_SHIFT_DURATION_PER_ROW_MS)
      ) + maxShiftDelayMs;
      scheduleUiTimeout(() => {
        setRowClearFlashRows([]);
        setClearEffectVariant("single");
        setClearIntensity(1);
      }, Math.max(LINE_CLEAR_FLASH_DURATION_MS, clearEffectDuration));
      scheduleUiTimeout(() => {
        setRowShiftBlocks([]);
      }, clearEffectDuration);

      if (clearedLineCount === 4) {
        scheduleUiTimeout(() => setIsTetrisClearActive(false), LINE_SHIFT_DURATION_MAX_MS + 140);
      }

      emitSound(
        didTSpin
          ? "tSpin"
          : clearedLineCount === 4
            ? (receivesBackToBackBonus ? "backToBack" : "tetris")
            : clearedLineCount > 1
              ? "lineClearMulti"
              : "lineClear"
      );
      triggerHaptic(clearedLineCount === 4 ? 28 : 16);
      comboChainRef.current += 1;
      previousClearWasTetrisRef.current = isDifficultClear;
    } else {
      if (didTSpin) {
        setMessage("T-Spin! +400 × level");
        emitSound("tSpin");
        triggerHaptic(18);
      } else {
        setMessage("Keep stacking clean.");
        setTSpinActive(false);
        emitSound("lock");
      }
      setClearEffectVariant("single");
      setClearIntensity(1);
      setComboCount(0);
      setBackToBackActive(false);
      comboChainRef.current = 0;
      previousClearWasTetrisRef.current = false;
    }

    if (!canSpawnUpcomingPiece) {
      setCurrentPiece(null);
      setCurrentPieceKey(null);
      setGameOver(true);
      setIsPaused(false);
      setMessage("Game over! Tap Play Again to run it back.");
      emitSound("gameOver");
      triggerHaptic(32);
      return;
    }

    setCurrentPiece(upcomingPiece);
    setCurrentPieceKey(upcomingPieceKey);
    setCurrentTileId(upcomingTileId);
    setCurrentPieceRow(0);
    setCurrentPieceCol(spawnCol);
    syncUpcomingQueue(refreshedQueueEntries);
    setPieceSpawnPulse(true);
    scheduleUiTimeout(() => setPieceSpawnPulse(false), 180);
    onAfterSpawn?.();
  }, [
    comboChainRef,
    emitSound,
    level,
    previousClearWasTetrisRef,
    scheduleUiTimeout,
    setBackToBackActive,
    setClearEffectVariant,
    setClearIntensity,
    setComboCount,
    setCurrentPiece,
    setCurrentPieceCol,
    setCurrentPieceKey,
    setCurrentPieceRow,
    setCurrentTileId,
    setGameOver,
    setImpactPulse,
    setIsPaused,
    setIsTetrisClearActive,
    setLevelUpPulse,
    setLockPulseCells,
    setMessage,
    setPieceSpawnPulse,
    setPointPopups,
    setRowClearFlashRows,
    setRowShiftBlocks,
    setScore,
    setTSpinActive,
    syncUpcomingQueue,
    triggerHaptic,
  ]);
}

