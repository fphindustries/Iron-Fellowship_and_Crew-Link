import { Box, Chip, Typography } from "@mui/material";
import FlagIcon from "@mui/icons-material/Flag";
import { CombatEndSessionEvent } from "types/SessionLog.type";
import { ROLL_RESULT } from "types/DieRolls.type";

function getOutcomeLabel(outcome: ROLL_RESULT): string {
  switch (outcome) {
    case ROLL_RESULT.HIT:
      return "Strong Hit";
    case ROLL_RESULT.WEAK_HIT:
      return "Weak Hit";
    case ROLL_RESULT.MISS:
      return "Miss";
    default:
      return "Unknown";
  }
}

function getOutcomeColor(
  outcome: ROLL_RESULT
): "success" | "warning" | "error" {
  switch (outcome) {
    case ROLL_RESULT.HIT:
      return "success";
    case ROLL_RESULT.WEAK_HIT:
      return "warning";
    case ROLL_RESULT.MISS:
      return "error";
    default:
      return "error";
  }
}

export interface CombatEndEventCardProps {
  event: CombatEndSessionEvent;
}

export function CombatEndEventCard({ event }: CombatEndEventCardProps) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
        <FlagIcon sx={{ fontSize: 16 }} color="primary" />
        <Typography variant="body2" fontWeight="bold">
          Combat Ends
        </Typography>
        <Chip
          label={getOutcomeLabel(event.outcome)}
          size="small"
          color={getOutcomeColor(event.outcome)}
          sx={{ height: 18, fontSize: "0.65rem" }}
        />
      </Box>
      {event.description && (
        <Typography
          variant="body2"
          color="text.secondary"
          fontStyle="italic"
        >
          &ldquo;{event.description}&rdquo;
        </Typography>
      )}
    </Box>
  );
}
