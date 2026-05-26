import { useCallback, useState } from "react";
import { useStore } from "stores/store";
import { getRoll } from "stores/appState/useRoller";
import { ROLL_RESULT, ROLL_TYPE } from "types/DieRolls.type";
import { momentumTrack } from "data/defaultTracks";
import { useMomentumBurn } from "./useMomentumBurn";

export interface RollData {
  statKey: string;
  statLabel: string;
  modifier: number;
  adds: number;
  action: number;
  challenge1: number;
  challenge2: number;
  score: number;
  outcome: ROLL_RESULT;
  matchedNegativeMomentum: boolean;
  momentumBurned?: number;
}

interface MoveRef {
  name: string;
  _id: string;
}

export function useMoveRoll() {
  const [rollData, setRollData] = useState<RollData | undefined>();
  const [rollId, setRollId] = useState<string | undefined>();

  // ── Character data ────────────────────────────────────────────────────────
  const characterStats = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.stats
  );
  const adds = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.adds ?? 0
  );
  const numberOfDebilities = useStore((s) =>
    Object.values(
      s.characters.currentCharacter.currentCharacter?.debilities ?? {}
    ).filter(Boolean).length
  );
  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId ?? null
  );
  const uid = useStore((s) => s.auth.uid);
  const campaignId = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaignId
  );

  // ── Store actions ─────────────────────────────────────────────────────────
  const updateCurrentCharacter = useStore(
    (s) => s.characters.currentCharacter.updateCurrentCharacter
  );
  const logMoveEvent = useStore((s) => s.sessionLog.logMoveEvent);
  const logStatChangeEvent = useStore((s) => s.sessionLog.logStatChangeEvent);
  const addRollToLog = useStore((s) => s.gameLog.addRoll);
  const addRollToScreen = useStore((s) => s.appState.addRoll);
  const updateRoll = useStore((s) => s.gameLog.updateRoll);

  // ── Momentum burn ─────────────────────────────────────────────────────────
  const {
    momentum,
    momentumResetValue,
    burnScore,
    burnOutcome,
    canBurnMomentum,
  } = useMomentumBurn(rollData);

  const maxMomentum = momentumTrack.max - numberOfDebilities;
  // Use post-burn momentum value for outcome effect calculations
  const currentMomentum =
    rollData?.momentumBurned !== undefined ? momentumResetValue : momentum;

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Performs the dice roll, records to game log, and sets rollData.
   *  Pass `modifierOverride` when the modifier comes from a condition meter
   *  rather than a stat (e.g. Check Your Gear rolls +supply). */
  const roll = useCallback(
    (statKey: string, statLabel: string, move: MoveRef, modifierOverride?: number) => {
      if (!characterStats && modifierOverride === undefined) return;
      const modifier = modifierOverride ?? characterStats?.[statKey] ?? 0;
      const action = getRoll(6);
      const challenge1 = getRoll(10);
      const challenge2 = getRoll(10);

      const matchedNegativeMomentum =
        momentum < 0 && Math.abs(momentum) === action;
      const effectiveAction = matchedNegativeMomentum ? 0 : action;
      const score = Math.min(10, effectiveAction + modifier + adds);

      let outcome: ROLL_RESULT;
      if (score > challenge1 && score > challenge2) outcome = ROLL_RESULT.HIT;
      else if (score <= challenge1 && score <= challenge2)
        outcome = ROLL_RESULT.MISS;
      else outcome = ROLL_RESULT.WEAK_HIT;

      setRollData({
        statKey,
        statLabel,
        modifier,
        adds,
        action,
        challenge1,
        challenge2,
        score,
        outcome,
        matchedNegativeMomentum,
      });

      const statRoll = {
        type: ROLL_TYPE.STAT as const,
        action,
        modifier,
        challenge1,
        challenge2,
        result: outcome,
        rollLabel: statLabel,
        moveName: move.name,
        moveId: move._id,
        timestamp: new Date(),
        characterId,
        uid,
        gmsOnly: false as const,
        matchedNegativeMomentum,
        ...(adds ? { adds } : {}),
      };
      addRollToLog({
        campaignId,
        characterId: characterId || undefined,
        roll: statRoll,
      })
        .then((id) => {
          setRollId(id);
          addRollToScreen(id, statRoll);
        })
        .catch(console.error);
    },
    [
      characterStats,
      momentum,
      adds,
      characterId,
      uid,
      campaignId,
      addRollToLog,
      addRollToScreen,
    ]
  );

  /** Applies the momentum burn to rollData (updates score, outcome, and records the burned value). */
  const burnMomentum = useCallback(() => {
    if (!rollData || !canBurnMomentum) return;
    setRollData({
      ...rollData,
      score: burnScore,
      outcome: burnOutcome,
      momentumBurned: momentum,
    });
  }, [rollData, canBurnMomentum, burnScore, burnOutcome, momentum]);

  /**
   * Call at the start of handleConfirm to finalize a burn: resets the character's
   * momentum to momentumResetValue, logs the stat change, and updates the game log roll.
   * No-ops if momentum was not burned.
   */
  const applyBurnOnConfirm = useCallback(
    async (move: MoveRef) => {
      if (!rollData || rollData.momentumBurned === undefined) return;
      const burnedValue = rollData.momentumBurned;
      await updateCurrentCharacter({ momentum: momentumResetValue });
      logStatChangeEvent({
        stat: "Momentum",
        previousValue: burnedValue,
        newValue: momentumResetValue,
        cause: "Burned momentum",
      });
      if (rollId) {
        updateRoll(rollId, {
          type: ROLL_TYPE.STAT,
          action: rollData.action,
          modifier: rollData.modifier,
          challenge1: rollData.challenge1,
          challenge2: rollData.challenge2,
          result: rollData.outcome,
          rollLabel: rollData.statLabel,
          moveName: move.name,
          moveId: move._id,
          timestamp: new Date(),
          characterId,
          uid,
          gmsOnly: false,
          matchedNegativeMomentum: rollData.matchedNegativeMomentum,
          momentumBurned: burnedValue,
          ...(rollData.adds ? { adds: rollData.adds } : {}),
        }).catch(console.error);
      }
    },
    [
      rollData,
      rollId,
      momentumResetValue,
      updateCurrentCharacter,
      logStatChangeEvent,
      updateRoll,
      characterId,
      uid,
    ]
  );

  /**
   * Logs the move event to the session log, assembling playerContext from the
   * optional context parts (player description, oracle result, outcome description).
   */
  const logMove = useCallback(
    async (
      move: MoveRef,
      playerContext: string,
      oracleResult?: { label: string; result: string },
      outcomeDescription?: string
    ) => {
      if (!rollData) return;
      const contextParts: string[] = [];
      if (playerContext.trim()) contextParts.push(playerContext.trim());
      if (oracleResult)
        contextParts.push(`${oracleResult.label}: ${oracleResult.result}`);
      if (outcomeDescription?.trim())
        contextParts.push(outcomeDescription.trim());

      await logMoveEvent({
        moveName: move.name,
        moveId: move._id,
        stat: rollData.statLabel,
        statValue: rollData.modifier,
        playerContext: contextParts.join("\n"),
        action: rollData.action,
        challengeDice: [rollData.challenge1, rollData.challenge2],
        score: rollData.score,
        outcome: rollData.outcome,
      });
    },
    [rollData, logMoveEvent]
  );

  /** Resets roll state (call in handleClose). */
  const resetRoll = useCallback(() => {
    setRollData(undefined);
    setRollId(undefined);
  }, []);

  return {
    // Roll state
    rollData,
    // Character data (for UI rendering)
    characterStats,
    adds,
    characterId,
    uid,
    // Momentum
    momentum,
    momentumResetValue,
    maxMomentum,
    burnScore,
    burnOutcome,
    canBurnMomentum,
    currentMomentum,
    // Store actions (for outcome effects in dialogs)
    updateCurrentCharacter,
    logStatChangeEvent,
    // Handlers
    roll,
    burnMomentum,
    applyBurnOnConfirm,
    logMove,
    resetRoll,
  };
}
