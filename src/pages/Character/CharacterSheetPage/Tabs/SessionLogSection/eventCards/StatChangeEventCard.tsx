import { Typography } from "@mui/material";
import { StatChangeSessionEvent } from "types/SessionLog.type";

export interface StatChangeEventCardProps {
  event: StatChangeSessionEvent;
}

export function StatChangeEventCard({ event }: StatChangeEventCardProps) {
  return (
    <Typography variant="body2">
      {event.stat} &nbsp; {event.previousValue} &rarr; {event.newValue}
    </Typography>
  );
}
