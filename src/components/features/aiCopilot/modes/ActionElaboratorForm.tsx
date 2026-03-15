import { Stack, TextField, Typography } from "@mui/material";

interface ActionElaboratorFormProps {
  action: string;
  onActionChange: (value: string) => void;
}

export function ActionElaboratorForm({
  action,
  onActionChange,
}: ActionElaboratorFormProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Describe a character action to get a vivid narrative version, likely
        risks, and suggested moves.
      </Typography>
      <TextField
        label="Character action"
        placeholder="e.g. Rook sneaks into the fuel depot to look for evidence"
        value={action}
        onChange={(e) => onActionChange(e.target.value)}
        multiline
        minRows={2}
        fullWidth
        size="small"
        required
      />
    </Stack>
  );
}
