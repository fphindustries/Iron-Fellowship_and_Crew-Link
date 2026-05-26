import { Typography } from "@mui/material";
import { JournalSessionEvent } from "types/SessionLog.type";
import { MarkdownContent } from "components/shared/MarkdownContent";

export interface JournalEventCardProps {
  event: JournalSessionEvent;
}

export function JournalEventCard({ event }: JournalEventCardProps) {
  if (event.isAiGenerated) {
    return (
      <MarkdownContent sx={{ fontStyle: "italic" }}>{event.text}</MarkdownContent>
    );
  }
  return (
    <Typography variant="body2">
      &ldquo;{event.text}&rdquo;
    </Typography>
  );
}
