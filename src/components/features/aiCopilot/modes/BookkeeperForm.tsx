import { Stack, TextField, Typography } from "@mui/material";

interface BookkeeperFormProps {
  sessionText: string;
  onSessionTextChange: (value: string) => void;
}

export function BookkeeperForm({
  sessionText,
  onSessionTextChange,
}: BookkeeperFormProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Describe what happened in freeform text. The AI will extract structured
        updates to vows, NPCs, and locations for your review.
      </Typography>
      <TextField
        label="Session events"
        placeholder={
          "e.g. We fulfilled the vow to find the smuggler, made a bond with Tala, and burned momentum to escape."
        }
        value={sessionText}
        onChange={(e) => onSessionTextChange(e.target.value)}
        multiline
        minRows={4}
        fullWidth
        size="small"
        required
      />
    </Stack>
  );
}
