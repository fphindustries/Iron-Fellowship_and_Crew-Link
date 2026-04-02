import { Box, Chip, Typography } from "@mui/material";
import SwordsIcon from "@mui/icons-material/SportsMartialArts";
import { CombatStartSessionEvent } from "types/SessionLog.type";

export interface CombatStartEventCardProps {
  event: CombatStartSessionEvent;
}

export function CombatStartEventCard({ event }: CombatStartEventCardProps) {
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
        <SwordsIcon sx={{ fontSize: 16 }} color="warning" />
        <Typography variant="body2" fontWeight="bold">
          Combat Begins
        </Typography>
        <Chip
          label={event.position === "in_control" ? "In Control" : "In a Bad Spot"}
          size="small"
          color={event.position === "in_control" ? "success" : "error"}
          sx={{ height: 18, fontSize: "0.65rem" }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        <strong>Objective:</strong> {event.objective}
      </Typography>
      {event.enemies.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          <strong>Enemies:</strong> {event.enemies.join(", ")}
        </Typography>
      )}
    </Box>
  );
}
