import { Box, Chip, Typography } from "@mui/material";
import { RollData } from "hooks/useMoveRoll";
import { getOutcomeLabel, getOutcomeColor } from "./moveUtils";

interface RollSummaryBoxProps {
  rollData: RollData;
  /** Current (pre-burn) momentum, used to display negative-momentum cancellation. */
  momentum: number;
}

export function RollSummaryBox({ rollData, momentum }: RollSummaryBoxProps) {
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      flexWrap="wrap"
      mb={2}
      p={1.5}
      sx={(theme) => ({ bgcolor: theme.palette.action.hover, borderRadius: 1 })}
    >
      <Typography variant="body2">
        {rollData.momentumBurned !== undefined ? (
          <>
            <s>d6:{rollData.action}</s>
            {` ⚡ momentum: ${rollData.momentumBurned}`}
          </>
        ) : rollData.matchedNegativeMomentum ? (
          <>
            <s>d6:{rollData.action}</s>
            {` (cancelled by momentum ${momentum})`}
          </>
        ) : (
          `d6: ${rollData.action}`
        )}
        {` + ${rollData.statLabel} (${rollData.modifier >= 0 ? "+" : ""}${rollData.modifier})`}
        {rollData.adds ? ` + ${rollData.adds} adds` : ""}
        {" = "}
        <strong>{rollData.score}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        vs
      </Typography>
      <Chip label={rollData.challenge1} size="small" variant="outlined" />
      <Chip label={rollData.challenge2} size="small" variant="outlined" />
      <Chip
        label={getOutcomeLabel(rollData.outcome)}
        color={getOutcomeColor(rollData.outcome)}
        size="small"
      />
    </Box>
  );
}
