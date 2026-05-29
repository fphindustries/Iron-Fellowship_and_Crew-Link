import { Box, Typography } from "@mui/material";
import { FocusMoveChip, FocusMoveGroup } from "./FocusMoveChip";

const EXPEDITION_MOVES = [
  { id: "starforged/moves/exploration/undertake_an_expedition", intent: "Press on toward your destination", color: "primary" as const },
  { id: "starforged/moves/exploration/explore_a_waypoint", intent: "Investigate the current location" },
  { id: "starforged/moves/exploration/finish_an_expedition", intent: "Arrive and resolve the journey" },
  { id: "starforged/moves/exploration/make_a_discovery", intent: "Record something remarkable" },
  { id: "starforged/moves/exploration/confront_chaos", intent: "Face something dire" },
];

export function ExpeditionFocusMode() {
  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" color="primary.main" sx={{ mb: 0.5 }}>
          Expedition
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Navigate the journey. Each leg brings new challenges.
        </Typography>
      </Box>
      <FocusMoveGroup label="Moves">
        {EXPEDITION_MOVES.map((m) => (
          <FocusMoveChip
            key={m.id}
            moveId={m.id}
            intent={m.intent}
            color={m.color}
          />
        ))}
      </FocusMoveGroup>
    </Box>
  );
}
