import { ROLL_RESULT } from "types/DieRolls.type";

export function getOutcomeLabel(outcome: ROLL_RESULT): string {
  if (outcome === ROLL_RESULT.HIT) return "Strong Hit";
  if (outcome === ROLL_RESULT.WEAK_HIT) return "Weak Hit";
  return "Miss";
}

export function getOutcomeColor(
  outcome: ROLL_RESULT
): "success" | "warning" | "error" {
  if (outcome === ROLL_RESULT.HIT) return "success";
  if (outcome === ROLL_RESULT.WEAK_HIT) return "warning";
  return "error";
}
