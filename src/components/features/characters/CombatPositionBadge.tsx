import { Chip } from "@mui/material";
import { useCombatTracker } from "hooks/useCombatTracker";

export function CombatPositionBadge() {
  const { activeCombat } = useCombatTracker();

  if (!activeCombat) return null;

  return activeCombat.position === "in_control" ? (
    <Chip label="In Control" size="small" color="success" />
  ) : (
    <Chip label="In a Bad Spot" size="small" color="error" />
  );
}
