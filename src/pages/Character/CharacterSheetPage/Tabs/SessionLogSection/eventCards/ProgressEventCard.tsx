import { Typography } from "@mui/material";
import { ProgressSessionEvent } from "types/SessionLog.type";

export interface ProgressEventCardProps {
  event: ProgressSessionEvent;
}

export function ProgressEventCard({ event }: ProgressEventCardProps) {
  const diff = event.newValue - event.previousValue;
  const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;

  return (
    <Typography variant="body2">
      {event.trackType}: {event.trackName} &nbsp; {event.previousValue} &rarr;{" "}
      {event.newValue} ({diffLabel})
    </Typography>
  );
}
