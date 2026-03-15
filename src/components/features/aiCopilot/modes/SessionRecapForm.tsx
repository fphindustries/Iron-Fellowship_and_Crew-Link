import { Stack, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface SessionRecapFormProps {
  hasNoteContent?: boolean;
}

export function SessionRecapForm({ hasNoteContent }: SessionRecapFormProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Summarize the session, extract canon facts, and generate a clean session
        log from recent rolls and your open note.
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {hasNoteContent ? (
          <CheckCircleOutlineIcon
            fontSize="small"
            color="success"
            sx={{ flexShrink: 0 }}
          />
        ) : (
          <InfoOutlinedIcon
            fontSize="small"
            color="info"
            sx={{ flexShrink: 0 }}
          />
        )}
        <Typography variant="caption" color="text.secondary">
          {hasNoteContent
            ? "Open note content will be included as context."
            : "Open a note in the Notes tab to include its content as context."}
        </Typography>
      </Stack>
    </Stack>
  );
}
