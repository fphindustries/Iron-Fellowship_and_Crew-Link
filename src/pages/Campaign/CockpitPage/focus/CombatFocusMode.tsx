import { Box, Divider, Typography } from "@mui/material";
import { FocusMoveChip, FocusMoveGroup } from "./FocusMoveChip";

const COMBAT_MOVE_GROUPS = [
  {
    label: "Act",
    moves: [
      { id: "starforged/moves/combat/gain_ground", intent: "Seize an advantage" },
      { id: "starforged/moves/combat/strike", intent: "Attack decisively", color: "error" as const },
      { id: "starforged/moves/combat/clash", intent: "Fight back against an attack", color: "error" as const },
    ],
  },
  {
    label: "Respond",
    moves: [
      { id: "starforged/moves/combat/react_under_fire", intent: "Protect yourself or allies" },
      { id: "starforged/moves/combat/take_decisive_action", intent: "End the fight", color: "warning" as const },
      { id: "starforged/moves/combat/battle", intent: "Fight an extended engagement" },
    ],
  },
];

export function CombatFocusMode() {
  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" color="error.main" sx={{ mb: 0.5 }}>
          Combat
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose your action or response. Click a move to roll.
        </Typography>
      </Box>

      {COMBAT_MOVE_GROUPS.map((group, i) => (
        <Box key={group.label}>
          {i > 0 && <Divider sx={{ mb: 2 }} />}
          <FocusMoveGroup label={group.label}>
            {group.moves.map((m) => (
              <FocusMoveChip
                key={m.id}
                moveId={m.id}
                intent={m.intent}
                color={m.color}
              />
            ))}
          </FocusMoveGroup>
        </Box>
      ))}
    </Box>
  );
}
