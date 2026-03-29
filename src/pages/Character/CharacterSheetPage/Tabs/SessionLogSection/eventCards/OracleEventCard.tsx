import { Typography } from "@mui/material";
import { OracleSessionEvent } from "types/SessionLog.type";

export interface OracleEventCardProps {
  event: OracleSessionEvent;
}

export function OracleEventCard({ event }: OracleEventCardProps) {
  return (
    <Typography variant="body2">
      {event.oracleName} &rarr; &ldquo;{event.result}&rdquo;
    </Typography>
  );
}
