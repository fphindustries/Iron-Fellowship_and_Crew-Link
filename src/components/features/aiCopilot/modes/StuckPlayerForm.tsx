import { Stack, TextField, Typography } from "@mui/material";

interface StuckPlayerFormProps {
  situation: string;
  onSituationChange: (value: string) => void;
}

export function StuckPlayerForm({
  situation,
  onSituationChange,
}: StuckPlayerFormProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Get next actions, complications, and escalation options when you
        don&apos;t know what to do next.
      </Typography>
      <TextField
        label="Current situation (optional)"
        placeholder="e.g. Just made a miss on a Face Danger move in the cargo bay"
        value={situation}
        onChange={(e) => onSituationChange(e.target.value)}
        multiline
        minRows={2}
        fullWidth
        size="small"
      />
    </Stack>
  );
}
