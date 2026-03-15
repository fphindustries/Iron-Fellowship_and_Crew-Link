import { Stack, TextField, Typography } from "@mui/material";

interface StoryGeneratorFormProps {
  objective: string;
  onObjectiveChange: (value: string) => void;
}

export function StoryGeneratorForm({
  objective,
  onObjectiveChange,
}: StoryGeneratorFormProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Generate scene possibilities, complications, and twists based on your
        current situation.
      </Typography>
      <TextField
        label="Current objective (optional)"
        placeholder="e.g. Infiltrate the fuel depot to find evidence"
        value={objective}
        onChange={(e) => onObjectiveChange(e.target.value)}
        multiline
        minRows={2}
        fullWidth
        size="small"
      />
    </Stack>
  );
}
