import { Box, Button, TextField, Typography } from "@mui/material";
import { useState } from "react";

export interface NameCharacterStepProps {
  onComplete: (name: string) => void;
  loading: boolean;
}

export function NameCharacterStep({ onComplete, loading }: NameCharacterStepProps) {
  const [name, setName] = useState("");

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Name Your Character
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        What do those who know you call you? Enter the name your character goes
        by.
      </Typography>
      <TextField
        label="Character Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
        disabled={loading}
      />
      <Button
        variant="contained"
        onClick={() => onComplete(name.trim())}
        disabled={!name.trim() || loading}
      >
        Create Character
      </Button>
    </Box>
  );
}
