import { useStore } from "stores/store";
import { ROLL_RESULT } from "types/DieRolls.type";

export interface BurnableRoll {
  modifier: number;
  adds: number;
  challenge1: number;
  challenge2: number;
  outcome: ROLL_RESULT;
  momentumBurned?: number;
}

function calcBurnOutcome(
  burnScore: number,
  challenge1: number,
  challenge2: number
): ROLL_RESULT {
  if (burnScore > challenge1 && burnScore > challenge2) return ROLL_RESULT.HIT;
  if (burnScore <= challenge1 && burnScore <= challenge2) return ROLL_RESULT.MISS;
  return ROLL_RESULT.WEAK_HIT;
}

export interface MomentumBurnValues {
  momentum: number;
  momentumResetValue: number;
  burnScore: number;
  burnOutcome: ROLL_RESULT;
  canBurnMomentum: boolean;
}

export function useMomentumBurn(roll: BurnableRoll | undefined): MomentumBurnValues {
  const momentum = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.momentum ?? 0
  );
  const momentumResetValue = useStore(
    (s) => s.characters.currentCharacter.momentumResetValue ?? 2
  );

  const burnScore = roll
    ? Math.min(10, momentum + roll.modifier + roll.adds)
    : 0;
  const burnOutcome = roll
    ? calcBurnOutcome(burnScore, roll.challenge1, roll.challenge2)
    : ROLL_RESULT.MISS;
  // Can burn if: momentum is positive, not already burned, and burning improves the result
  // Lower enum value = better (HIT=0 < WEAK_HIT=1 < MISS=2)
  const canBurnMomentum =
    roll != null &&
    !roll.momentumBurned &&
    momentum > 0 &&
    burnOutcome < roll.outcome;

  return { momentum, momentumResetValue, burnScore, burnOutcome, canBurnMomentum };
}
