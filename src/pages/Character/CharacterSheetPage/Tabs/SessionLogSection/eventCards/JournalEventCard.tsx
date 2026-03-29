import { Typography } from "@mui/material";
import { JournalSessionEvent } from "types/SessionLog.type";

export interface JournalEventCardProps {
  event: JournalSessionEvent;
}

export function JournalEventCard({ event }: JournalEventCardProps) {
  return (
    <Typography
      variant="body2"
      fontStyle={event.isAiGenerated ? "italic" : "normal"}
    >
      {event.isAiGenerated ? "AI: " : ""}
      &ldquo;{event.text}&rdquo;
    </Typography>
  );
}
